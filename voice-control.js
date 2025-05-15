// Web Speech API Integration for Pattern Voice Control

// 1. Ask for microphone permission on startup
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = false;

const patternListElement = document.querySelector('#patternList ul');
const patternListItems = patternListElement.querySelectorAll('li');

function highlightActivePattern(index) {
    patternListItems.forEach((item, i) => {
        if (i === index) {
            item.style.color = '#00f3ff';
            item.style.fontSize = '22px';
            item.style.fontWeight = 'bold';
        } else {
            item.style.color = '';
            item.style.fontSize = '18px';
            item.style.fontWeight = '';
        }
    });
}

function transitionToNamedPattern(name) {
    const index = patternNames.findIndex(p => p.toLowerCase() === name.toLowerCase());
    if (index !== -1 && index !== currentPattern && !isTransitioning) {
        transitionToPattern(index);
        highlightActivePattern(index);
    }
}

recognition.onresult = function(event) {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            console.log("Heard:", transcript);
            for (const name of patternNames) {
                if (transcript.includes(name.toLowerCase())) {
                    transitionToNamedPattern(name);
                    break;
                }
            }
        }
    }
};

recognition.onerror = function(event) {
    console.warn('Speech recognition error:', event.error);
};

recognition.onend = function() {
    // Restart recognition automatically
    recognition.start();
};

// 2. Start recognition on window load
window.addEventListener('load', () => {
    try {
        recognition.start();
        console.log('Speech recognition started');
    } catch (e) {
        console.error('Speech recognition failed to start:', e);
    }

    highlightActivePattern(currentPattern); // initial highlight
});