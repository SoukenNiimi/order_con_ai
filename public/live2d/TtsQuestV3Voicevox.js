// TtsQuestV3Voicevox.js

class TtsQuestV3Voicevox extends Audio {
    constructor(speakerId, text, ttsQuestApiKey) {
        super();
        var params = {};
        params['key'] = ttsQuestApiKey;
        params['speaker'] = speakerId;
        params['text'] = text;
        const query = new URLSearchParams(params);
        this.#main(this, query);
    }

    #main(owner, query) {
        if (owner.src.length > 0) return;
        var apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        fetch(apiUrl + '?' + query.toString())
            .then(response => response.json())
            .then(response => {
                if (typeof response.retryAfter !== 'undefined') {
                    // setTimeout(owner.#main, 1000 * (1 + response.retryAfter), owner, query);
                    setTimeout(() => owner.#main(owner, query), 1000 * (1 + response.retryAfter));
                } else if (response.success === true) {
                    // Success:trueの場合に特定の処理を実行
                    console.log("APIからデータを取得しました。");
                    // ここにSuccess:trueの場合に行いたい処理を追加
                    // 例えば、生成した音声を再生するなど

                    // mp3StreamingUrlが存在するか確認してから再生するなどの処理も追加できます
                    if (typeof response.mp3StreamingUrl !== 'undefined') {
                        owner.handleSuccess(response); // 成功時の処理を呼び出す
                    }
                } else if (typeof response.errorMessage !== 'undefined') {
                    throw new Error(response.errorMessage);
                } else {
                    throw new Error("serverError");
                }
            });
    }

    // 成功時の処理を追加
    handleSuccess(response) {
        // 成功時の処理を記述
        console.log("音声合成に成功しました。いつでも再生できます。");
        // ここでフラグをTrueにするか、他の処理を追加できます。
        this.src = response.mp3StreamingUrl;
        // owner.play(); // 生成した音声を再生
    }
}

// TypeScriptで利用するためにエクスポート
// export { TtsQuestV3Voicevox };
