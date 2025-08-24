const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const fileListDisplay = document.getElementById('file-list');
const convertButton = document.getElementById('convert-button');
const clearButton = document.getElementById('clear-button');
const resultsHeader = document.getElementById('results-header');
const downloadAllButton = document.getElementById('download-all-button');
const resultsContainer = document.getElementById('results-container');

let selectedFiles = [];
let conversionResults = [];

// --- イベントリスナー ---
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('drag-over'); });
dropArea.addEventListener('dragleave', (e) => { e.preventDefault(); dropArea.classList.remove('drag-over'); });
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); });

convertButton.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    convertButton.disabled = true;
    convertButton.textContent = '変換中...';

    for (const file of selectedFiles) {
        try {
            const result = await convertFileToPng(file);
            conversionResults.push(result);
            displayResult(result.pngDataUrl, result.pngFileName);
        } catch (error) {
            console.error('変換エラー:', error);
            alert(`${file.name} の変換に失敗しました。`);
        }
    }

    resetSelectedFiles();
    updateResultsHeader();
});

clearButton.addEventListener('click', () => { resetAll(); });

downloadAllButton.addEventListener('click', () => {
    const zip = new JSZip();
    const usedFileNames = {};

    conversionResults.forEach(result => {
        let fileName = result.pngFileName;
        let counter = 1;
        const namePart = fileName.substring(0, fileName.lastIndexOf('.'));
        const extPart = fileName.substring(fileName.lastIndexOf('.'));

        while (usedFileNames[fileName]) {
            fileName = `${namePart}(${counter})${extPart}`;
            counter++;
        }
        usedFileNames[fileName] = true;

        const base64Data = result.pngDataUrl.split(',')[1];
        zip.file(fileName, base64Data, { base64: true });
    });

    zip.generateAsync({ type: 'blob' }).then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'converted_images.zip';
        link.click();
        URL.revokeObjectURL(link.href);
    });
});

// --- 関数 ---
function handleFiles(files) {
    const newFiles = Array.from(files).filter(file => file.type === 'image/webp');
    if (newFiles.length === 0) return;
    selectedFiles = [...selectedFiles, ...newFiles];
    updateFileList();
    convertButton.disabled = false;
}

function updateFileList() {
    fileListDisplay.innerHTML = '<strong>選択中のファイル:</strong>';
    const ul = document.createElement('ul');
    selectedFiles.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        ul.appendChild(li);
    });
    fileListDisplay.appendChild(ul);
}

function convertFileToPng(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const image = new Image();
            image.src = e.target.result;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                const pngDataUrl = canvas.toDataURL('image/png');
                const pngFileName = file.name.replace(/\.webp$/i, '.png');
                resolve({ pngDataUrl, pngFileName });
            };
            image.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function displayResult(pngDataUrl, pngFileName) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';

    // 削除ボタンを作成
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&times;'; // ×記号
    deleteBtn.onclick = () => {
        // DOMから要素を削除
        resultItem.remove();

        // 結果管理配列から該当データを削除
        conversionResults = conversionResults.filter(result => result.pngFileName !== pngFileName);

        // ヘッダー（クリアボタンやZIPダウンロードボタン）の表示を更新
        updateResultsHeader();
    };

    const fileNameElement = document.createElement('p');
    fileNameElement.className = 'file-name';
    fileNameElement.textContent = pngFileName;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'result-image-container';

    const img = document.createElement('img');
    img.src = pngDataUrl;
    img.alt = pngFileName;

    imageContainer.appendChild(img);

    const downloadLink = document.createElement('a');
    downloadLink.href = pngDataUrl;
    downloadLink.download = pngFileName;
    downloadLink.className = 'button';
    downloadLink.textContent = 'ダウンロード';

    resultItem.appendChild(deleteBtn);
    resultItem.appendChild(fileNameElement);
    resultItem.appendChild(imageContainer);
    resultItem.appendChild(downloadLink);
    resultsContainer.appendChild(resultItem);
}

function resetSelectedFiles() {
    selectedFiles = [];
    fileInput.value = '';
    fileListDisplay.innerHTML = '';
    convertButton.textContent = '変換実行';
    convertButton.disabled = true;
}

function updateResultsHeader() {
    if (conversionResults.length > 0) {
        resultsHeader.style.display = 'flex';
    } else {
        resultsHeader.style.display = 'none';
    }
    downloadAllButton.style.display = conversionResults.length > 1 ? 'inline-block' : 'none';
}

function resetAll() {
    resetSelectedFiles();
    conversionResults = [];
    resultsContainer.innerHTML = '';
    resultsHeader.style.display = 'none';
}
