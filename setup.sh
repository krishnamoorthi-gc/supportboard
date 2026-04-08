#!/usr/bin/env bash
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║           SupportDesk — Quick Start             ║"
echo "╚══════════════════════════════════════════════════╝"

# Install backend deps
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install --silent
cd ..

# Install frontend deps
echo "📦 Installing frontend dependencies..."
cd frontend && npm install --silent
cd ..

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "⚠️  IMPORTANT: Edit backend/.env and add your ANTHROPIC_API_KEY"
echo ""
echo "▶  To start:"
echo "   Terminal 1 (backend):  cd backend && npm start"
echo "   Terminal 2 (frontend): cd frontend && npm run dev"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "👤 Login: priya@supportdesk.app / demo123"
