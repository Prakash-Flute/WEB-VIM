#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tree Manager - Auto-updates tree.txt when files change
Location: /storage/emulated/0/WEB-VIM/Localhost/Appps/tree_manager.py
Output: /storage/emulated/0/WEB-VIM/tree.txt
"""

import os
import time
import threading
from pathlib import Path
from datetime import datetime

# Paths
BASE_DIR = "/storage/emulated/0/WEB-VIM"
TREE_FILE = os.path.join(BASE_DIR, "tree.txt")
WATCH_DIRS = [BASE_DIR]  # Watch entire WEB-VIM

# Exclude patterns
EXCLUDE = {'__pycache__', '.git', 'node_modules', '.env', 'tree.txt'}
EXCLUDE_EXT = {'.pyc', '.bak', '.tmp', '.swp'}

class TreeManager:
    def __init__(self):
        self.running = False
        self.last_tree = ""
        self.thread = None
        
    def generate_tree(self):
        """Generate tree structure"""
        lines = []
        base = Path(BASE_DIR)
        
        lines.append(f"{base.name}/")
        lines.append("")
        
        def walk(path, prefix=""):
            try:
                items = sorted([p for p in path.iterdir() 
                              if p.name not in EXCLUDE 
                              and not any(p.name.endswith(e) for e in EXCLUDE_EXT)])
            except:
                return
            
            dirs = [p for p in items if p.is_dir()]
            files = [p for p in items if p.is_file()]
            all_items = dirs + files
            
            for i, item in enumerate(all_items):
                is_last = (i == len(all_items) - 1)
                connector = "└── " if is_last else "├── "
                lines.append(f"{prefix}{connector}{item.name}")
                
                if item.is_dir():
                    new_prefix = prefix + ("    " if is_last else "│   ")
                    walk(item, new_prefix)
        
        walk(base)
        return "\n".join(lines)
    
    def count_items(self):
        """Count directories and files"""
        dirs = files = 0
        for root, dirnames, filenames in os.walk(BASE_DIR):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE]
            dirs += len(dirnames)
            files += len([f for f in filenames if not any(f.endswith(e) for e in EXCLUDE_EXT)])
        return dirs, files
    
    def save_tree(self):
        """Save tree to file"""
        tree = self.generate_tree()
        
        # Only save if changed
        if tree == self.last_tree:
            return
            
        d, f = self.count_items()
        
        content = f"""# WEB-VIM Project Tree
# Auto-updated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
# Directories: {d} | Files: {f}

{tree}

# End of Tree
"""
        try:
            with open(TREE_FILE, 'w', encoding='utf-8') as fobj:
                fobj.write(content)
            self.last_tree = tree
            print(f"🌳 Tree auto-updated [{datetime.now().strftime('%H:%M:%S')}]")
        except Exception as e:
            print(f"❌ Tree update failed: {e}")
    
    def watch_loop(self):
        """Watch for changes using polling"""
        print("👁️  Tree Watcher started - Monitoring WEB-VIM...")
        self.save_tree()  # Initial save
        
        while self.running:
            try:
                current_tree = self.generate_tree()
                if current_tree != self.last_tree:
                    self.save_tree()
                time.sleep(2)  # Check every 2 seconds
            except Exception as e:
                print(f"⚠️  Watcher error: {e}")
                time.sleep(5)
    
    def start(self):
        """Start watcher in background thread"""
        if self.running:
            return
            
        self.running = True
        self.thread = threading.Thread(target=self.watch_loop, daemon=True)
        self.thread.start()
        print("✅ Tree Manager activated with server")
    
    def stop(self):
        """Stop watcher"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)

# Global instance
tree_manager = TreeManager()
