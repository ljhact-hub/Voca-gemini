const app = {
    words: [],
    incorrectWords: [],
    currentQuizWords: [],
    currentQuizIndex: 0,
    score: 0,
    isReviewMode: false,
    flashcardIndex: 0,

    // 초기화 함수
    init: async function() {
        await this.loadWords();
        this.loadIncorrectWords();
        this.updateMenuStats();
    },

    // JSON 데이터 가져오기
    loadWords: async function() {
        try {
            const response = await fetch('./words.json');
            this.words = await response.json();
        } catch (error) {
            console.error("단어 데이터를 불러오는 데 실패했습니다.", error);
            alert("단어 데이터를 불러올 수 없습니다. 로컬 파일 시스템에서 실행 중이라면 웹 서버를 통해 실행하거나 GitHub Pages에 배포 후 확인하세요.");
        }
    },

    // 로컬 스토리지에서 오답 데이터 로드
    loadIncorrectWords: function() {
        const stored = localStorage.getItem('yonseiToeicIncorrect');
        if (stored) {
            this.incorrectWords = JSON.parse(stored);
        }
    },

    // 오답 데이터 저장
    saveIncorrectWords: function() {
        localStorage.setItem('yonseiToeicIncorrect', JSON.stringify(this.incorrectWords));
    },

    // 메인 통계 업데이트
    updateMenuStats: function() {
        const statsEl = document.getElementById('total-words-info');
        statsEl.textContent = `총 단어: ${this.words.length}개 | 오답 노트: ${this.incorrectWords.length}개`;
    },

    // 뷰 전환 로직
    changeView: function(viewId) {
        // 모든 섹션 숨기기
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
            setTimeout(() => el.classList.add('hidden'), 50); // 트랜지션 보조
        });

        // 지정된 섹션 보이기
        const targetView = document.getElementById(viewId);
        targetView.classList.remove('hidden');
        targetView.classList.add('active');

        // 뷰에 따른 초기화
        if (viewId === 'menu-view') {
            this.updateMenuStats();
        } else if (viewId === 'list-view') {
            this.renderWordList(this.words);
        }
    },

    // 단어장 렌더링
    renderWordList: function(list) {
        const container = document.getElementById('word-list-container');
        container.innerHTML = '';
        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.innerHTML = `<span><strong>${item.word}</strong></span><span>${item.meaning}</span>`;
            container.appendChild(div);
        });
    },

    // 단어 검색
    searchWords: function() {
        const query = document.getElementById('search-input').value.toLowerCase();
        const filtered = this.words.filter(item => 
            item.word.toLowerCase().includes(query) || 
            item.meaning.includes(query)
        );
        this.renderWordList(filtered);
    },

    // 유틸: 배열 섞기 (Fisher-Yates)
    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // 퀴즈 시작
    startQuiz: function(reviewMode) {
        this.isReviewMode = reviewMode;
        
        if (reviewMode && this.incorrectWords.length === 0) {
            alert("오답 노트에 저장된 단어가 없습니다!");
            return;
        }

        // 대상 단어 목록 설정 및 섞기
        let targetList = reviewMode ? this.incorrectWords : this.words;
        
        // 퀴즈용 단어 10개 추출 (10개 미만이면 전체)
        const shuffledList = this.shuffleArray([...targetList]);
        this.currentQuizWords = shuffledList.slice(0, 10);
        
        this.currentQuizIndex = 0;
        this.score = 0;
        
        document.getElementById('quiz-title').textContent = reviewMode ? "오답 다시 풀기" : "단어 퀴즈";
        this.changeView('quiz-view');
        this.loadNextQuestion();
    },

    // 다음 퀴즈 문제 로드
    loadNextQuestion: function() {
        if (this.currentQuizIndex >= this.currentQuizWords.length) {
            this.showResult();
            return;
        }

        const currentWord = this.currentQuizWords[this.currentQuizIndex];
        document.getElementById('quiz-word').textContent = currentWord.word;
        
        // 진행률 바 및 카운터 업데이트
        const progress = ((this.currentQuizIndex) / this.currentQuizWords.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progress}%`;
        document.getElementById('quiz-counter').textContent = `${this.currentQuizIndex + 1} / ${this.currentQuizWords.length}`;

        // 선택지 생성 (정답 1 + 오답 3)
        let options = [currentWord.meaning];
        let wrongOptions = this.words.filter(w => w.word !== currentWord.word);
        wrongOptions = this.shuffleArray(wrongOptions).slice(0, 3);
        
        wrongOptions.forEach(w => options.push(w.meaning));
        options = this.shuffleArray(options);

        // 버튼 렌더링
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

    // 정답 확인 로직
    checkAnswer: function(btn, selectedMeaning, currentWordObj) {
        // 중복 클릭 방지
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        const isCorrect = selectedMeaning === currentWordObj.meaning;

        if (isCorrect) {
            btn.classList.add('correct');
            this.score++;
            
            // 오답 노트에서 맞췄다면 제거
            if (this.isReviewMode) {
                this.incorrectWords = this.incorrectWords.filter(w => w.word !== currentWordObj.word);
                this.saveIncorrectWords();
            }
        } else {
            btn.classList.add('wrong');
            // 정답 표시
            allBtns.forEach(b => {
                if (b.textContent === currentWordObj.meaning) b.classList.add('correct');
            });
            
            // 오답 노트에 추가 (중복 방지)
            const isAlreadyIncorrect = this.incorrectWords.some(w => w.word === currentWordObj.word);
            if (!isAlreadyIncorrect) {
                this.incorrectWords.push(currentWordObj);
                this.saveIncorrectWords();
            }
        }

        // 1.5초 후 다음 문제
        setTimeout(() => {
            this.currentQuizIndex++;
            this.loadNextQuestion();
        }, 1500);
    },

    // 퀴즈 결과 출력
    showResult: function() {
        this.changeView('result-view');
        document.getElementById('result-score').textContent = `${this.score} / ${this.currentQuizWords.length}`;
        const msg = document.getElementById('result-message');
        
        if (this.score === this.currentQuizWords.length) {
            msg.textContent = "완벽합니다! 훌륭한 성취입니다.";
        } else if (this.score >= this.currentQuizWords.length * 0.7) {
            msg.textContent = "좋습니다! 조금만 더 노력해 보세요.";
        } else {
            msg.textContent = "오답 노트를 활용해 복습해 보세요.";
        }
    },

    // 플래시카드 기능 시작
    startFlashcards: function() {
        if (this.words.length === 0) return;
        this.flashcardIndex = 0;
        this.updateFlashcardUI();
        this.changeView('flashcard-view');
    },

    // 플래시카드 업데이트
    updateFlashcardUI: function() {
        const word = this.words[this.flashcardIndex];
        document.getElementById('flashcard-word').textContent = word.word;
        document.getElementById('flashcard-meaning').textContent = word.meaning;
        document.getElementById('flashcard-counter').textContent = `${this.flashcardIndex + 1} / ${this.words.length}`;
        
        // 카드 뒤집기 상태 초기화
        document.getElementById('flashcard-inner').classList.remove('flipped');
    },

    // 카드 뒤집기
    flipCard: function() {
        document.getElementById('flashcard-inner').classList.toggle('flipped');
    },

    // 이전/다음 카드
    prevCard: function() {
        if (this.flashcardIndex > 0) {
            this.flashcardIndex--;
            this.updateFlashcardUI();
        }
    },

    nextCard: function() {
        if (this.flashcardIndex < this.words.length - 1) {
            this.flashcardIndex++;
            this.updateFlashcardUI();
        }
    }
};

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
