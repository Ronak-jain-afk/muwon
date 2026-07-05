use std::fs::File;
use std::io::BufReader;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use crossbeam_channel::{bounded, Receiver, Sender, select};
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};

pub enum PlaybackCommand {
    Load(String),
    Play,
    Pause,
    SetVolume(f64),
    SetMute(bool),
    Quit,
}

#[derive(Debug, Clone)]
pub enum PlaybackEvent {
    Loaded(String),
    Playing,
    Paused,
    Stopped,
    Position(f64),
    EndOfTrack,
    Error(String),
    Duration(f64),
}

/// Ponytail: single-thread audio pipeline. rodio Decoder wraps
/// symphonia internally for format support. The audio thread is
/// the owner; the handle sends commands via a channel.
pub struct PlaybackEngine {
    command_tx: Sender<PlaybackCommand>,
    event_rx: Receiver<PlaybackEvent>,
    running: Arc<AtomicBool>,
}

impl PlaybackEngine {
    pub fn new() -> Self {
        let (cmd_tx, cmd_rx) = bounded(64);
        let (evt_tx, evt_rx) = bounded(64);
        let running = Arc::new(AtomicBool::new(true));
        let r = running.clone();

        thread::spawn(move || {
            let mut engine = EngineInner::new(evt_tx);
            engine.run(cmd_rx, r);
        });

        Self { command_tx: cmd_tx, event_rx: evt_rx, running }
    }

    pub fn send(&self, cmd: PlaybackCommand) -> Result<(), String> {
        self.command_tx.send(cmd).map_err(|e| e.to_string())
    }

    pub fn try_recv_event(&self) -> Option<PlaybackEvent> {
        self.event_rx.try_recv().ok()
    }
}

impl Drop for PlaybackEngine {
    fn drop(&mut self) {
        let _ = self.command_tx.send(PlaybackCommand::Quit);
        self.running.store(false, Ordering::Relaxed);
    }
}

struct EngineInner {
    evt_tx: Sender<PlaybackEvent>,
    volume: f64,
    muted: bool,
    position: f64,
    duration: f64,
    sink: Option<Sink>,
    _stream: OutputStream,
    _stream_handle: OutputStreamHandle,
}

impl EngineInner {
    fn new(evt_tx: Sender<PlaybackEvent>) -> Self {
        let (_stream, _stream_handle) = OutputStream::try_default()
            .expect("Failed to open audio output");
        Self {
            evt_tx,
            volume: 0.8,
            muted: false,
            position: 0.0,
            duration: 0.0,
            sink: None,
            _stream,
            _stream_handle,
        }
    }

    fn run(&mut self, cmd_rx: Receiver<PlaybackCommand>, running: Arc<AtomicBool>) {
        let tick = crossbeam_channel::tick(Duration::from_millis(250));

        loop {
            select! {
                recv(cmd_rx) -> cmd => {
                    match cmd {
                        Ok(PlaybackCommand::Load(p)) => self.load(&p),
                        Ok(PlaybackCommand::Play) => self.play(),
                        Ok(PlaybackCommand::Pause) => self.pause(),
                        Ok(PlaybackCommand::SetVolume(v)) => self.set_volume(v),
                        Ok(PlaybackCommand::SetMute(m)) => self.set_mute(m),
                        Ok(PlaybackCommand::Quit) | Err(_) => break,
                    }
                }
                recv(tick) -> _ => self.tick(),
            }
            if !running.load(Ordering::Relaxed) { break; }
        }
    }

    fn load(&mut self, path: &str) {
        self.stop();

        let file = match File::open(path) {
            Ok(f) => f,
            Err(e) => {
                let _ = self.evt_tx.send(PlaybackEvent::Error(
                    format!("Cannot open file: {e}")
                ));
                return;
            }
        };

        let source = match Decoder::new(BufReader::new(file)) {
            Ok(src) => src,
            Err(e) => {
                let _ = self.evt_tx.send(PlaybackEvent::Error(
                    format!("Cannot decode audio: {e}")
                ));
                return;
            }
        };

        self.duration = source.total_duration()
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0);

        let sink = Sink::try_new(&self._stream_handle).unwrap();
        sink.set_volume(if self.muted { 0.0 } else { self.volume as f32 });
        sink.append(source);

        self.sink = Some(sink);
        self.position = 0.0;

        let _ = self.evt_tx.send(PlaybackEvent::Duration(self.duration));
        let _ = self.evt_tx.send(PlaybackEvent::Loaded(path.to_string()));
    }

    fn play(&mut self) {
        if let Some(sink) = &self.sink {
            sink.play();
            let _ = self.evt_tx.send(PlaybackEvent::Playing);
        }
    }

    fn pause(&mut self) {
        if let Some(sink) = &self.sink {
            sink.pause();
            let _ = self.evt_tx.send(PlaybackEvent::Paused);
        }
    }

    fn stop(&mut self) {
        self.sink = None;
        self.position = 0.0;
        self.duration = 0.0;
        let _ = self.evt_tx.send(PlaybackEvent::Stopped);
    }

    fn set_volume(&mut self, vol: f64) {
        self.volume = vol.clamp(0.0, 1.0);
        if let Some(sink) = &self.sink {
            sink.set_volume(if self.muted { 0.0 } else { self.volume as f32 });
        }
    }

    fn set_mute(&mut self, muted: bool) {
        self.muted = muted;
        if let Some(sink) = &self.sink {
            sink.set_volume(if self.muted { 0.0 } else { self.volume as f32 });
        }
    }

    fn tick(&mut self) {
        if let Some(sink) = &self.sink {
            if sink.empty() && self.position > 0.0 {
                let _ = self.evt_tx.send(PlaybackEvent::EndOfTrack);
                self.stop();
                return;
            }
            self.position = sink.get_pos().as_secs_f64();
            let _ = self.evt_tx.send(PlaybackEvent::Position(self.position));
        }
    }
}
