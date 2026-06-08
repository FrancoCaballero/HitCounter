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
    pub last_style: Arc<RwLock<String>>,
    pub tx: broadcast::Sender<String>,
}

fn wrap(kind: &str, data_json: &str) -> String {
    format!(r#"{{"kind":"{}","data":{}}}"#, kind, data_json)
}

impl OverlayState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel::<String>(64);
        Self {
            last_state: Arc::new(RwLock::new(String::from("{}"))),
            last_style: Arc::new(RwLock::new(String::from("{}"))),
            tx,
        }
    }

    pub async fn push_state(&self, payload: String) {
        let msg = wrap("state", &payload);
        *self.last_state.write().await = payload;
        let _ = self.tx.send(msg);
    }

    pub async fn push_style(&self, payload: String) {
        let msg = wrap("style", &payload);
        *self.last_style.write().await = payload;
        let _ = self.tx.send(msg);
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
    let style = state.last_style.read().await.clone();
    let initial_state = state.last_state.read().await.clone();
    if socket
        .send(Message::Text(wrap("style", &style)))
        .await
        .is_err()
    {
        return;
    }
    if socket
        .send(Message::Text(wrap("state", &initial_state)))
        .await
        .is_err()
    {
        return;
    }

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
