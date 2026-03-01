import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    let apiKey = process.env.OPENROUTER_API_KEY;

    // Sanitize API key: Remove UTF-8 BOM (\ufeff) and trim whitespace
    if (apiKey) {
        apiKey = apiKey.replace(/^\ufeff/, '').trim();
    }

    if (!apiKey) {
        return NextResponse.json({ error: 'OpenRouter API key is not configured.' }, { status: 500 });
    }

    try {
        const { messages, difficulty, model } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
        }

        // Determine difficulty instruction
        let difficultyInstruction = '';
        switch (difficulty) {
            case 'hard':
                difficultyInstruction = '判定は【厳しめ】です。プレイヤーの軽率な行動や甘い判断に対しては容赦なく死やゲームオーバーの結末を与えてください。';
                break;
            case 'easy':
                difficultyInstruction = '判定は【易しめ】です。致命的な失敗を極力避け、プレイヤーが物語を楽しめるようにストーリー進行やロールプレイを重視してください。キャラクターは滅多なことでは死にません。';
                break;
            case 'normal':
            default:
                difficultyInstruction = '判定は【普通】です。標準的なTRPGのように、適度な緊張感を持たせつつ、論理的な行動には成功を与え、無謀な行動にはふさわしい代償を与えてください。';
                break;
        }

        const systemPrompt = `
あなたはプロのTRPGゲームマスター（GM）です。プレイヤーとジャズのセッションのように対話しながら、即興で物語を紡いでください。

## ゲームのルールと世界観
- **世界観**: TRPGの舞台となる世界観（SF、ファンタジー、サイバーパンク、現代ホラーなど）をランダムに決定し、その設定に従って物語を進めてください。初回のメッセージで世界観を簡単に説明し、導入を描写してください。
- **難易度設定**: ${difficultyInstruction}
- **進行方法**:
  - 状況を豊かに描写し、常に最後に「あなたはどう行動しますか？」のようにプレイヤーの入力を促す形で終わってください。
  - プレイヤーの入力（行動）に対して、難易度に基づき成否を判定し、その結果と次の展開を描写してください。

## 出力フォーマット（重要）
必ず以下のJSON形式でのみ回答してください。余分なテキストやMarkdownのコードブロック構文（\`\`\`json など）を含めないでください。

{
  "story": "GMとしての状況描写、キャラクターのセリフ、判定結果などを自然な文章で記述してください。",
  "image_prompt": "現在の場面や状況を表す、画像生成AIのための英語の短いプロンプト（例: dark gothic forest, cyberpunk city street）を記述してください。"
}
`;

        // First message starts the game
        const isFirstMessage = messages.length === 0 || (messages.length === 1 && messages[0].content === "start");

        const formattedMessages = isFirstMessage ? [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'ゲームを開始してください。世界観を生成し、最初の状況を描写してください。' }
        ] : [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
                "X-Title": "TRPG Web App",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model || "meta-llama/llama-3.3-70b-instruct:free",
                messages: formattedMessages
                // Removed response_format as it causes 500 errors with many free models
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            return NextResponse.json({ error: 'Failed to fetch from OpenRouter.' }, { status: response.status });
        }

        const data = await response.json();
        let assistantMessage = data.choices[0].message.content;

        // Strip markdown blocks if the model wrapped it
        if (assistantMessage.startsWith("```json")) {
            assistantMessage = assistantMessage.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        } else if (assistantMessage.startsWith("```")) {
            assistantMessage = assistantMessage.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
        }

        let parsedContent;
        try {
            parsedContent = JSON.parse(assistantMessage);
        } catch {
            console.error("Failed to parse assistant JSON:", assistantMessage);
            parsedContent = {
                story: assistantMessage,
                image_prompt: "abstract beautiful landscape",
                status: "playing"
            };
        }

        return NextResponse.json({
            story: parsedContent.story || parsedContent.text || parsedContent.message || assistantMessage,
            image_prompt: parsedContent.image_prompt || "abstract beautiful landscape",
            status: parsedContent.status || "playing"
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
