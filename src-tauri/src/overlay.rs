use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct OverlayState {
    pub last_state: Arc<RwLock<String>>,
    pub tx: broadcast::Sender<String>,
}

impl OverlayState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel::<String>(64);
        Self {
            last_state: Arc::new(RwLock::new(String::from("{}"))),
            tx,
        }
    }

    pub async fn push(&self, payload: String) {
        *self.last_state.write().await = payload.clone();
        let _ = self.tx.send(payload);
    }
}

pub async fn start_server(state: OverlayState, port: u16) {
    let app = Router::new()
        .route("/", get(index))
        .route("/ws", get(ws_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        let _ = axum::serve(listener, app).await;
    }
}

async fn index() -> impl IntoResponse {
    Html(include_str!("../overlay/index.html"))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<OverlayState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: OverlayState) {
    let initial = state.last_state.read().await.clone();
    let _ = socket.send(Message::Text(initial)).await;

    let mut rx = state.tx.subscribe();
    loop {
        tokio::select! {
            msg = rx.recv() => {
                match msg {
                    Ok(payload) => {
                        if socket.send(Message::Text(payload)).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                }
            }
            incoming = socket.recv() => {
                match incoming {
                    Some(Ok(_)) => {}
                    _ => break,
                }
            }
        }
    }
}
