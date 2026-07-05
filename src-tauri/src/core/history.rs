use std::collections::VecDeque;

#[derive(Debug, Clone)]
pub struct HistoryEntry {
    pub song_id: String,
    pub position: f64,
}

pub struct History {
    stack: VecDeque<HistoryEntry>,
    max_size: usize,
}

impl History {
    pub fn new(max_size: usize) -> Self {
        Self { stack: VecDeque::with_capacity(max_size.min(100)), max_size }
    }

    pub fn push(&mut self, entry: HistoryEntry) {
        if self.stack.len() >= self.max_size {
            self.stack.pop_front();
        }
        self.stack.push_back(entry);
    }

    pub fn pop(&mut self) -> Option<HistoryEntry> {
        self.stack.pop_back()
    }
}
