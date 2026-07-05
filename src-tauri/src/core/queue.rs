use std::collections::VecDeque;
use crate::models::RepeatMode;

/// Ponytail: global lock for queue operations. Per-listener locks
/// if contention ever shows up in profiling.
pub struct QueueManager {
    queue: VecDeque<String>,
    shuffled_sequence: Option<Vec<usize>>,
    current_sequence_index: usize,
    shuffle_enabled: bool,
    repeat_mode: RepeatMode,
}

impl QueueManager {
    pub fn new() -> Self {
        Self {
            queue: VecDeque::new(),
            shuffled_sequence: None,
            current_sequence_index: 0,
            shuffle_enabled: false,
            repeat_mode: RepeatMode::Off,
        }
    }

    pub fn add_to_queue(&mut self, song_ids: Vec<String>) {
        for id in song_ids {
            self.queue.push_back(id);
        }
    }

    pub fn remove_from_queue(&mut self, index: usize) {
        if index < self.queue.len() {
            self.queue.remove(index);
        }
    }

    pub fn clear_queue(&mut self) {
        self.queue.clear();
    }

    pub fn get_queue(&self) -> &VecDeque<String> {
        &self.queue
    }

    /// Determine the next track to play.
    /// 1. If the explicit queue has items, pop the front and return it.
    /// 2. Otherwise, resolve from the active playlist using shuffle/repeat.
    pub fn next(
        &mut self,
        current_song_id: Option<&str>,
        playlist_ids: &[String],
    ) -> Option<String> {
        // Step 1: explicit queue has priority
        if let Some(next) = self.queue.pop_front() {
            return Some(next);
        }

        if playlist_ids.is_empty() {
            return None;
        }

        let current_pos = current_song_id
            .and_then(|id| playlist_ids.iter().position(|p| p == id))
            .unwrap_or(0);

        if self.shuffle_enabled {
            self.next_shuffled(current_pos, playlist_ids)
        } else {
            self.next_linear(current_pos, playlist_ids)
        }
    }

    fn next_linear(&self, current_pos: usize, ids: &[String]) -> Option<String> {
        let next = current_pos + 1;
        if next >= ids.len() {
            match self.repeat_mode {
                RepeatMode::All => Some(ids[0].clone()),
                RepeatMode::Off | RepeatMode::One => None,
            }
        } else {
            Some(ids[next].clone())
        }
    }

    fn next_shuffled(&mut self, current_pos: usize, ids: &[String]) -> Option<String> {
        if self.shuffled_sequence.is_none() {
            self.generate_shuffle(current_pos, ids.len());
        }

        let seq = self.shuffled_sequence.as_ref().unwrap();
        let shuffled_pos = seq.iter().position(|&i| i == current_pos)?;
        let next_idx = shuffled_pos + 1;

        if next_idx >= seq.len() {
            match self.repeat_mode {
                RepeatMode::All => {
                    self.generate_shuffle(current_pos, ids.len());
                    self.shuffled_sequence
                        .as_ref()
                        .and_then(|s| s.first())
                        .map(|&i| ids[i].clone())
                }
                RepeatMode::Off | RepeatMode::One => None,
            }
        } else {
            Some(ids[seq[next_idx]].clone())
        }
    }

    fn generate_shuffle(&mut self, forbidden: usize, n: usize) {
        if n <= 1 {
            self.shuffled_sequence = Some(vec![0]);
            return;
        }

        let mut seq: Vec<usize> = (0..n).collect();
        // Fisher-Yates
        for i in (1..n).rev() {
            let j = fastrand::usize(..=i);
            seq.swap(i, j);
        }
        // Forbid first element = forbidden
        if seq[0] == forbidden {
            let swap_idx = fastrand::usize(1..n);
            seq.swap(0, swap_idx);
        }
        self.shuffled_sequence = Some(seq);
    }

    pub fn set_shuffle(&mut self, enabled: bool, current_pos: usize, playlist_len: usize) {
        self.shuffle_enabled = enabled;
        if enabled {
            self.generate_shuffle(current_pos, playlist_len);
            // Place current track at position 0 so playback continues uninterrupted
            if let Some(seq) = &mut self.shuffled_sequence {
                if let Some(pos) = seq.iter().position(|&i| i == current_pos) {
                    seq.swap(0, pos);
                }
            }
            self.current_sequence_index = 0;
        } else {
            self.shuffled_sequence = None;
            self.current_sequence_index = current_pos;
        }
    }

    pub fn is_shuffle_enabled(&self) -> bool {
        self.shuffle_enabled
    }

    pub fn set_repeat_mode(&mut self, mode: RepeatMode) {
        self.repeat_mode = mode;
    }

    pub fn repeat_mode(&self) -> RepeatMode {
        self.repeat_mode
    }
}
