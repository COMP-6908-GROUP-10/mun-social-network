import db from "./sql-db";

db.pragma("foreign_keys = ON");

// USERS table
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
         user_id INTEGER PRIMARY KEY AUTOINCREMENT,
         username TEXT NULL,
         identifier TEXT UNIQUE,
         email TEXT NULL,
         password_hash TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`).run();

// POSTS table
db.prepare(`
    CREATE TABLE IF NOT EXISTS posts (
         post_id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id INTEGER NOT NULL,
         identifier TEXT UNIQUE,          -- global post UUID
         title TEXT NULL,
         content TEXT,
         media_url TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
`).run();

// COMMENTS table
db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        parent_comment_id INTEGER,
        identifier TEXT UNIQUE,          -- global comment UUID
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
        );
`).run();

// POST_LIKES table
db.prepare(`
    CREATE TABLE IF NOT EXISTS post_likes (
      like_id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      identifier TEXT UNIQUE,           -- global like UUID
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE (post_id, user_id)
        );
`).run();

// CONNECTIONS table
db.prepare(`
    CREATE TABLE IF NOT EXISTS connections (
        connection_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id1 INTEGER NOT NULL,
        user_id2 INTEGER NOT NULL,
        identifier TEXT UNIQUE,           -- global connection UUID
        status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id1) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id2) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE (user_id1, user_id2)
        );
`).run();

// FOLLOWERS table
db.prepare(`
    CREATE TABLE IF NOT EXISTS followers (
         follower_id INTEGER NOT NULL,
         followed_id INTEGER NOT NULL,
         identifier TEXT UNIQUE,           -- global follower UUID (optional)
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (follower_id, followed_id),
        FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (followed_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
`).run();

db.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_created_at     ON posts(created_at);`).run()
db.prepare(`CREATE INDEX IF NOT EXISTS idx_posts_user_id        ON posts(user_id);`).run()

db.prepare(`CREATE INDEX IF NOT EXISTS idx_comments_post_id     ON comments(post_id);`).run()

db.prepare(`CREATE INDEX IF NOT EXISTS idx_likes_post_id        ON post_likes(post_id);`).run()

db.prepare(`CREATE INDEX IF NOT EXISTS idx_followers_followed   ON followers(followed_id);`).run()
db.prepare(`CREATE INDEX IF NOT EXISTS idx_followers_follower   ON followers(follower_id);`).run()

console.log("✅ All tables created or verified successfully.");
