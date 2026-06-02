import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import Database from 'better-sqlite3';
import type { Word, ReviewLog, ReviewStats, WordFilter } from '../src/types/word';

// --- Database Setup ---
let db: Database.Database;

function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'words.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      english TEXT UNIQUE NOT NULL,
      chinese TEXT NOT NULL,
      add_date DATE NOT NULL,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      next_review DATE,
      last_review DATE,
      mastery_level INTEGER DEFAULT 0,
      status TEXT DEFAULT 'learning'
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      review_date TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      user_answer TEXT
    );

    CREATE TABLE IF NOT EXISTS game_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot INTEGER UNIQUE NOT NULL,
      save_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// --- IPC Handlers ---

// Words
ipcMain.handle('db:getWords', (_event, filter?: WordFilter) => {
  let sql = 'SELECT * FROM words';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter?.keyword) {
    conditions.push('(english LIKE ? OR chinese LIKE ?)');
    params.push(`%${filter.keyword}%`, `%${filter.keyword}%`);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY id DESC';

  // Limit handled in renderer if needed
  return db.prepare(sql).all(...params) as Word[];
});

ipcMain.handle('db:addWord', (_event, english: string, chinese: string) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT id FROM words WHERE english = ?').get(english);
  if (existing) {
    return { added: false, message: `单词 "${english}" 已存在` };
  }
  db.prepare(
    'INSERT INTO words (english, chinese, add_date, next_review) VALUES (?, ?, ?, ?)'
  ).run(english, chinese, today, today);
  return { added: true, message: `已添加: ${english}` };
});

ipcMain.handle('db:deleteWord', (_event, id: number) => {
  db.prepare('DELETE FROM words WHERE id = ?').run(id);
  db.prepare('DELETE FROM review_logs WHERE word_id = ?').run(id);
});

ipcMain.handle('db:updateWordStatus', (_event, id: number, status: string) => {
  const today = new Date().toISOString().split('T')[0];
  let nextReview = today;
  if (status === 'mastered') {
    const d = new Date(); d.setDate(d.getDate() + 30);
    nextReview = d.toISOString().split('T')[0];
  } else if (status === 'reviewing') {
    const d = new Date(); d.setDate(d.getDate() + 1);
    nextReview = d.toISOString().split('T')[0];
  }
  db.prepare(
    'UPDATE words SET status = ?, next_review = ? WHERE id = ?'
  ).run(status, nextReview, id);
});

// Review
ipcMain.handle('db:getWordsForReview', (_event, mode: string) => {
  const today = new Date().toISOString().split('T')[0];
  let sql: string;
  if (mode === 'daily') {
    sql = "SELECT * FROM words WHERE status IN ('learning','reviewing') AND next_review <= ? ORDER BY correct_count ASC LIMIT 15";
  } else if (mode === 'review') {
    sql = "SELECT * FROM words WHERE status = 'reviewing' AND next_review <= ? ORDER BY correct_count ASC LIMIT 15";
  } else {
    sql = "SELECT * FROM words WHERE status = 'mastered' ORDER BY RANDOM() LIMIT 15";
  }
  return db.prepare(sql).all(today) as Word[];
});

ipcMain.handle('db:recordReview', (_event, wordId: number, isCorrect: boolean, userAnswer: string) => {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(
    'INSERT INTO review_logs (word_id, review_date, is_correct, user_answer) VALUES (?, ?, ?, ?)'
  ).run(wordId, today, isCorrect ? 1 : 0, userAnswer);

  const word = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId) as Word;
  if (!word) return;

  if (isCorrect) {
    const newCorrect = word.correct_count + 1;
    const newMastery = Math.min(word.mastery_level + 1, 6);
    let newStatus = word.status;
    if (newMastery >= 5) newStatus = 'mastered';
    else if (newMastery >= 2) newStatus = 'reviewing';

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + (newStatus === 'mastered' ? 30 : 1));
    db.prepare(
      'UPDATE words SET correct_count = ?, mastery_level = ?, status = ?, next_review = ?, last_review = ? WHERE id = ?'
    ).run(newCorrect, newMastery, newStatus, nextReview.toISOString().split('T')[0], today, wordId);
  } else {
    const newWrong = word.wrong_count + 1;
    const newMastery = Math.max(word.mastery_level - 1, 0);
    db.prepare(
      'UPDATE words SET wrong_count = ?, mastery_level = ?, last_review = ? WHERE id = ?'
    ).run(newWrong, newMastery, today, wordId);
  }
});

ipcMain.handle('db:getReviewStats', () => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
  const learning = (db.prepare("SELECT COUNT(*) as count FROM words WHERE status = 'learning'").get() as { count: number }).count;
  const reviewing = (db.prepare("SELECT COUNT(*) as count FROM words WHERE status = 'reviewing'").get() as { count: number }).count;
  const mastered = (db.prepare("SELECT COUNT(*) as count FROM words WHERE status = 'mastered'").get() as { count: number }).count;
  const today = new Date().toISOString().split('T')[0];
  const todayReviewed = (db.prepare(
    'SELECT COUNT(DISTINCT word_id) as count FROM review_logs WHERE review_date = ?'
  ).get(today) as { count: number }).count;
  return { total, learning, reviewing, mastered, todayReviewed } as ReviewStats;
});

// Export CSV
ipcMain.handle('db:exportCSV', () => {
  const { dialog } = require('electron');
  const fs = require('fs');
  const words = db.prepare('SELECT * FROM words ORDER BY id').all() as Word[];
  const header = 'id,english,chinese,add_date,correct_count,wrong_count,next_review,last_review,mastery_level,status';
  const rows = words.map(w =>
    `${w.id},"${w.english}","${w.chinese}",${w.add_date},${w.correct_count},${w.wrong_count},${w.next_review || ''},${w.last_review || ''},${w.mastery_level},${w.status}`
  );
  const csv = '﻿' + header + '\n' + rows.join('\n');
  const result = dialog.showSaveDialogSync({
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    defaultPath: 'words_export.csv',
  });
  if (result) {
    fs.writeFileSync(result, csv, 'utf-8');
    return { success: true, path: result };
  }
  return { success: false };
});

// Save/Load game state
ipcMain.handle('save:write', (_event, slot: number, data: string) => {
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO game_saves (slot, save_data, updated_at) VALUES (?, ?, ?)'
  ).run(slot, data, now);
  return { success: true };
});

ipcMain.handle('save:read', (_event, slot: number) => {
  const row = db.prepare('SELECT save_data, updated_at FROM game_saves WHERE slot = ?').get(slot) as { save_data: string; updated_at: string } | undefined;
  return row ? { data: JSON.parse(row.save_data), updatedAt: row.updated_at } : null;
});

ipcMain.handle('save:listSlots', () => {
  const rows = db.prepare('SELECT slot, updated_at FROM game_saves ORDER BY slot').all() as { slot: number; updated_at: string }[];
  return rows;
});

// --- Window Creation ---
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 980,
    minHeight: 630,
    title: '猫咪学习助手',
    icon: join(__dirname, '../assets/main/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#1a1a2e',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') app.quit();
});
