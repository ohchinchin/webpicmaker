"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

type Role = 'system' | 'user' | 'assistant';
interface Message {
  role: Role;
  content: string;
}

interface ChatResponse {
  story: string;
  image_prompt: string;
}

export default function Home() {
  const [gameState, setGameState] = useState<'opening' | 'playing' | 'gameover'>('opening');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [model, setModel] = useState<string>('meta-llama/llama-3.3-70b-instruct:free');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<{ sender: 'gm' | 'player', text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [hasChatError, setHasChatError] = useState(false);
  const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(true);

  // Fallback models if primary fails (Verified Free Models - March 2026)
  const FALLBACK_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'deepseek/deepseek-r1:free'
  ];

  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available free models on load
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableModels(data);
          const defaultModel = data.find(m => m.id === 'meta-llama/llama-3.3-70b-instruct:free');
          setModel(defaultModel ? defaultModel.id : data[0].id);
        }
      })
      .catch(err => console.error("Failed to fetch models", err))
      .finally(() => setIsFetchingModels(false));
  }, []);

  // Auto-scroll chat history
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  const startGame = async () => {
    setGameState('playing');
    setIsLoading(true);
    setHasChatError(false);
    setChatHistory([{ sender: 'gm', text: 'システム: セッションを開始しています... 世界観を構築中...' }]);

    try {
      const { data, error } = await callChatApiWithRetry([], difficulty, model);
      if (data && data.story) {
        setChatHistory([{ sender: 'gm', text: data.story }]);
        setMessages([{ role: 'assistant', content: data.story }]);
        if (data.image_prompt) {
          updateImage(data.image_prompt);
        }
      } else {
        setHasChatError(true);
        const errorMsg = error || '通信に失敗しました。';
        setChatHistory(prev => [...prev, { sender: 'gm', text: `Error: ${errorMsg} 再試行してください。` }]);
      }
    } catch (e) {
      console.error(e);
      setHasChatError(true);
      setChatHistory(prev => [...prev, { sender: 'gm', text: 'Error: GMとの通信中に予期せぬエラーが発生しました。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const callChatApiWithRetry = async (history: Message[], diff: string, selectedModel: string, retries = 3): Promise<{ data: ChatResponse | null, error?: string }> => {
    let currentModel = selectedModel;
    let attempts = 0;
    let lastError = '';

    while (attempts < retries) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, difficulty: diff, model: currentModel })
        });

        const result = await response.json();

        if (response.ok) {
          return { data: result };
        } else {
          lastError = result.error || `HTTP ${response.status}`;
        }

        if (attempts < FALLBACK_MODELS.length) {
          currentModel = FALLBACK_MODELS[attempts];
          console.log(`Retrying with fallback model: ${currentModel}`);
          setModel(currentModel); 
        }
      } catch (e: any) {
        lastError = e.message || 'Network error';
        console.error(`Attempt ${attempts + 1} failed:`, e);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { data: null, error: lastError };
  };

  const updateImage = (prompt: string) => {
    setIsImageLoading(true);
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);

    const encodedPrompt = encodeURIComponent('detailed, high quality, ' + prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    setCurrentImageUrl(url);

    imageTimeoutRef.current = setTimeout(() => {
      setIsImageLoading(false);
    }, 15000);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText.trim();
    setInputText('');
    setHasChatError(false);

    setChatHistory(prev => [...prev, { sender: 'player', text: userText }]);

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userText }
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data, error } = await callChatApiWithRetry(newMessages, difficulty, model);
      if (data && data.story) {
        setChatHistory(prev => [...prev, { sender: 'gm', text: data.story }]);
        setMessages([...newMessages, { role: 'assistant', content: data.story }]);

        if (data.image_prompt) {
          updateImage(data.image_prompt);
        }

        if (data.story.includes('ゲームオーバー') || data.story.includes('GAME OVER') || data.story.includes('死んでしまった')) {
          setGameState('gameover');
        }
      } else {
        setHasChatError(true);
        const errorMsg = error || '通信が途切れました。';
        setChatHistory(prev => [...prev, { sender: 'gm', text: `Error: ${errorMsg}` }]);
      }
    } catch (e) {
      console.error(e);
      setHasChatError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (isLoading) return;
    setHasChatError(false);
    setIsLoading(true);

    try {
      const { data, error } = await callChatApiWithRetry(messages, difficulty, model);
      if (data && data.story) {
        setChatHistory(prev => [...prev, { sender: 'gm', text: data.story }]);
        setMessages([...messages, { role: 'assistant', content: data.story }]);
        if (data.image_prompt) updateImage(data.image_prompt);
      } else {
        setHasChatError(true);
        const errorMsg = error || '再試行に失敗しました。';
        setChatHistory(prev => [...prev, { sender: 'gm', text: `Error: ${errorMsg}` }]);
      }
    } catch (e) {
      setHasChatError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (gameState === 'opening') {
    return (
      <div className="full-center app-container">
        <div className="panel animate-fade-in" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="header">
            <h1>AI TRPG Session</h1>
            <p style={{ color: 'var(--text-muted)' }}>無限の物語が、あなたを待っている。</p>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h3>難易度を選択</h3>
            <div className="difficulty-selector">
              <div
                className={`diff-card ${difficulty === 'easy' ? 'selected' : ''}`}
                onClick={() => setDifficulty('easy')}
              >
                <h3>易しめ</h3>
                <p>物語重視。<br />致命的な失敗を回避。</p>
              </div>
              <div
                className={`diff-card ${difficulty === 'normal' ? 'selected' : ''}`}
                onClick={() => setDifficulty('normal')}
              >
                <h3>普通</h3>
                <p>標準的なバランス。<br />論理的行動がカギ。</p>
              </div>
              <div
                className={`diff-card ${difficulty === 'hard' ? 'selected' : ''}`}
                onClick={() => setDifficulty('hard')}
              >
                <h3>厳しめ</h3>
                <p>シビアな判定。<br />常に死と隣り合わせ。</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3>モデルを選択 (Free Models)</h3>
            {isFetchingModels ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>モデル情報を取得中...</p>
            ) : availableModels.length > 0 ? (
              <select
                className="input-field"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ marginTop: '8px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id} style={{ color: 'black' }}>
                    {m.name || m.id}
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ color: '#ff4d4f', marginTop: '8px' }}>モデル情報の取得に失敗しました</p>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{ width: '100%' }}
              disabled={isFetchingModels || !model}
            >
              {isFetchingModels ? 'モデル起動準備中...' : 'SESSION START'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header" style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.8rem' }}>AI TRPG Session</h1>
      </div>

      <div className="main-content animate-fade-in">
        <div className="visual-panel">
          <div className="image-container">
            {currentImageUrl ? (
              <>
                <Image
                  src={currentImageUrl}
                  alt="Scenario Visual"
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => setIsImageLoading(false)}
                  width={800}
                  height={450}
                  className="w-full h-auto rounded"
                  style={{ opacity: isImageLoading ? 0.3 : 1, width: '100%', height: 'auto' }}
                  priority={true}
                  unoptimized={true}
                />
                {isImageLoading && (
                  <div className="image-loading-overlay">
                    <div style={{ textAlign: 'center' }}>
                      <div className="loader" style={{ marginBottom: '12px' }}></div>
                      <p>Generating Scene...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="image-loading-overlay">
                <p style={{ color: 'var(--text-muted)' }}>Waiting for scene...</p>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Difficulty</span>
              <div style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>
                {difficulty.toUpperCase()}
              </div>
            </div>
            {gameState === 'gameover' && (
              <div style={{ color: '#ff4d4f', fontWeight: 'bold', animation: 'pulseGlow 2s infinite' }}>
                GAME OVER
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
            >
              Restart
            </button>
          </div>
        </div>

        <div className="chat-panel panel">
          <div className="chat-history" ref={chatHistoryRef}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px' }}>
                  {msg.sender === 'gm' ? 'Game Master' : 'You'}
                </div>
                <div>
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message gm" style={{ opacity: 0.7 }}>
                <div className="loader"></div> <span style={{ marginLeft: '8px' }}>GMが考えています...</span>
              </div>
            )}
          </div>

          <div className="chat-input-area border-t pt-4 mt-2">
            <textarea
              className="input-field"
              placeholder={gameState === 'gameover' ? "ゲームオーバーのため入力できません" : "行動を入力してください... (Enterで送信)"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || gameState === 'gameover'}
              style={{ flex: 1, resize: 'none', height: '60px' }}
            />
            {hasChatError ? (
              <button
                className="btn-primary"
                onClick={handleRetry}
                disabled={isLoading}
                style={{ height: '60px', padding: '0 24px', background: 'linear-gradient(135deg, #ff4d4f, #ff7875)' }}
              >
                Retry
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim() || gameState === 'gameover'}
                style={{ height: '60px', padding: '0 24px' }}
              >
                Action
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
