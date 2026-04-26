const app = {
    words: [],
    incorrectWords: [],
    learnedWords: [],
    currentQuizWords: [],
    currentQuizIndex: 0,
    score: 0,
    isReviewMode: false,
    flashcardIndex: 0,

    init: async function() {
        await this.loadWords();
        this.loadStorage();
        this.updateMenuStats();
    },

    loadWords: async function() {
        try {
            const response = await fetch('./words.json');
            this.words = await response.json();
        } catch (error) {
            console.error("단어 데이터를 불러오는 데 실패했습니다.", error);
        }
    },

    // 수정 4: localStorage JSON 파싱 안전성 확보
    loadStorage: function() {
        try {
            const wrong = localStorage.getItem('yonseiToeicWrong');
            const learned = localStorage.getItem('yonseiToeicLearned');

            this.incorrectWords = wrong ? JSON.parse(wrong) : [];
            this.learnedWords = learned ? JSON.parse(learned) : [];
        } catch (e) {
            console.error("localStorage 파싱 오류", e);
            this.incorrectWords = [];
            this.learnedWords = [];
        }
    },

    saveStorage: function() {
        localStorage.setItem('yonseiToeicWrong', JSON.stringify(this.incorrectWords));
        localStorage.setItem('yonseiToeicLearned', JSON.stringify(this.learnedWords));
    },

    updateMenuStats: function() {
        document.getElementById('total-words').textContent = this.words.length;
        document.getElementById('incorrect-words').textContent = this.incorrectWords.length;
        
        const percent = this.words.length ? Math.floor((this.learnedWords.length / this.words.length) * 100) : 0;
        document.getElementById('progress-percent').textContent = percent;
        document.getElementById('total-progress').style.width = `${percent}%`;
    },

    changeView: function(viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        if (viewId === 'menu-view') this.updateMenuStats();
        if (viewId === 'list-view') this.renderWordList(this.words);
    },

    renderWordList: function(list) {
        const container = document.getElementById('word-list-container');
        container.innerHTML = '';
        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.innerHTML = `<strong>${item.word}</strong> <span>${item.meaning}</span>`;
            container.appendChild(div);
        });
    },

    searchWords: function() {
        const query = document.getElementById('search-input').value.toLowerCase();
        const filtered = this.words.filter(item => 
            item.word.toLowerCase().includes(query) || item.meaning.includes(query)
        );
        this.renderWordList(filtered);
    },

    shuffleArray: function(array) {
        let arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    startQuiz: function(reviewMode) {
        this.isReviewMode = reviewMode;
        if (reviewMode && this.incorrectWords.length === 0) {
            alert("오답 노트에 저장된 단어가 없습니다!");
            return;
        }

        let targetList = reviewMode ? this.words.filter(w => this.incorrectWords.includes(w.word)) : this.words;
        this.currentQuizWords = this.shuffleArray(targetList).slice(0, 10);
        
        this.currentQuizIndex = 0;
        this.score = 0;
        
        document.getElementById('quiz-title').textContent = reviewMode ? "오답 다시 풀기" : "단어 퀴즈";
        this.changeView('quiz-view');
        this.loadNextQuestion();
    },

    loadNextQuestion: function() {
        if (this.currentQuizIndex >= this.currentQuizWords.length) {
            this.showResult();
            return;
        }

        const currentWord = this.currentQuizWords[this.currentQuizIndex];
        document.getElementById('quiz-word').textContent = currentWord.word;
        
        const progress = ((this.currentQuizIndex) / this.currentQuizWords.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progress}%`;
        document.getElementById('quiz-counter').textContent = `${this.currentQuizIndex + 1} / ${this.currentQuizWords.length}`;

        // 수정 3: 단어 개수가 적을 때를 대비한 방어 로직
        const optionCount = Math.min(4, this.words.length);

        // 수정 2: 동의어(뜻이 같은 다른 단어)로 인한 보기 중복 방지 (Set 활용)
        const wrongMeanings = [...new Set(
            this.words
                .filter(w => w.word !== currentWord.word)
                .map(w => w.meaning)
        )];

        const wrongOptions = this.shuffleArray(wrongMeanings).slice(0, optionCount - 1);
        
        const options = this.shuffleArray([
            currentWord.meaning,
            ...wrongOptions
        ]);

        const optionsContainer = document.getElementById('quiz-options-container');
        optionsContainer.innerHTML = '';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => this.checkAnswer(btn, opt, currentWord);
            optionsContainer.appendChild(btn);
        });
    },

    checkAnswer: function(btn, selectedMeaning, currentWordObj) {
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        if (selectedMeaning === currentWordObj.meaning) {
            btn.classList.add('correct');
            this.score++;
            
            if (!this.learnedWords.includes(currentWordObj.word)) {
                this.learnedWords.push(currentWordObj.word);
            }
            this.incorrectWords = this.incorrectWords.filter(w => w !== currentWordObj.word);
        } else {
            btn.classList.add('wrong');
            allBtns.forEach(b => { if (b.textContent === currentWordObj.meaning) b.classList.add('correct'); });
            
            if (!this.incorrectWords.includes(currentWordObj.word)) {
                this.incorrectWords.push(currentWordObj.word);
            }
        }
        this.saveStorage();

        setTimeout(() => {
            this.currentQuizIndex++;
            this.loadNextQuestion();
        }, 1200);
    },

    showResult: function() {
        this.changeView('result-view');
        document.getElementById('result-score').textContent = `${this.score} / ${this.currentQuizWords.length}`;
        const msg = document.getElementById('result-message');
        
        if (this.score === this.currentQuizWords.length) msg.textContent = "완벽합니다! 훌륭한 성취입니다.";
        else if (this.score >= this.currentQuizWords.length * 0.7) msg.textContent = "좋습니다! 조금만 더 노력해 보세요.";
        else msg.textContent = "오답 노트를 활용해 복습해 보세요.";
    },

    startFlashcards: function() {
        if (this.words.length === 0) return;
        this.flashcardIndex = 0;
        this.updateFlashcardUI();
        this.changeView('flashcard-view');
    },

    updateFlashcardUI: function() {
        const word = this.words[this.flashcardIndex];
        document.getElementById('flashcard-word').textContent = word.word;
        document.getElementById('flashcard-meaning').textContent = word.meaning;
        document.getElementById('flashcard-counter').textContent = `${this.flashcardIndex + 1} / ${this.words.length}`;
        document.getElementById('flashcard-inner').classList.remove('flipped');
    },

    flipCard: function() { 
        document.getElementById('flashcard-inner').classList.toggle('flipped'); 
    },

    // 수정 5: 플래시카드 순환 구조 적용 (끝에서 처음으로, 처음에서 끝으로)
    prevCard: function() { 
        if (this.words.length === 0) return;
        this.flashcardIndex = (this.flashcardIndex - 1 + this.words.length) % this.words.length;
        this.updateFlashcardUI(); 
    },
    nextCard: function() { 
        if (this.words.length === 0) return;
        this.flashcardIndex = (this.flashcardIndex + 1) % this.words.length;
        this.updateFlashcardUI(); 
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
