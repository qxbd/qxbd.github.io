function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function encrypt(data, key) {
    return CryptoJS.AES.encrypt(data, key).toString();
}

function decrypt(data, key) {
    try {
        const bytes = CryptoJS.AES.decrypt(data, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        throw new Error('Decryption failed');
    }
}

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.getElementById('downloadLink');
    link.href = url;
    link.download = fileName;
    link.style.display = 'block';
    link.click();
    link.style.display = 'none';
    URL.revokeObjectURL(url);
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = percent + '%';
}

function alertMessage(message) {
    alert(message);
}

document.getElementById('batchEncryptButton').addEventListener('click', function() {
    document.getElementById('batchEncryptInput').click();
});

document.getElementById('batchEncryptInput').addEventListener('change', async function(event) {
    const files = Array.from(event.target.files);
    const key = document.getElementById('encryptionKey').value;

    if (!key) {
        alertMessage('请输入加密密钥');
        return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    let encryptedContent = '';
    let progress = 0;

    for (const file of files) {
        try {
            const base64Image = await getBase64(file);
            const customFormattedImage = encrypt(base64Image, key);
            encryptedContent += file.name + '\n' + customFormattedImage + '\n';
            progress++;
            updateProgress((progress / files.length) * 100);
        } catch (error) {
            console.error("Error converting to Base64:", error);
        }
    }

    const binaryContent = new TextEncoder().encode(encryptedContent);
    downloadFile(binaryContent, 'encrypted_images.enc');
    updateProgress(0);  // 重置进度条
});

document.getElementById('singleEncryptButton').addEventListener('click', function() {
    document.getElementById('singleEncryptInput').click();
});

document.getElementById('singleEncryptInput').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    const key = document.getElementById('encryptionKey').value;

    if (!key) {
        alertMessage('请输入加密密钥');
        return;
    }

    try {
        const base64Image = await getBase64(file);
        const customFormattedImage = encrypt(base64Image, key);
        const binaryContent = new TextEncoder().encode(file.name + '\n' + customFormattedImage);
        downloadFile(binaryContent, 'encrypted_image.enc');
        updateProgress(100);  // 完成单个文件时进度条满
    } catch (error) {
        console.error("Error converting to Base64:", error);
    }

    setTimeout(() => updateProgress(0), 1000);  // 短暂显示完成状态后重置进度条
});

document.getElementById('decryptButton').addEventListener('click', function() {
    document.getElementById('decryptInput').click();
});

document.getElementById('decryptInput').addEventListener('change', async function(event) {
    const files = event.target.files;
    const imageContainer = document.getElementById('imageContainer');
    const key = document.getElementById('decryptionKey').value;

    if (!key) {
        alertMessage('请输入解密密钥');
        return;
    }

    imageContainer.innerHTML = '';
    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    let progress = 0;
    const images = [];

    for (const file of sortedFiles) {
        try {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(e) {
                const decryptedContent = e.target.result;
                const lines = decryptedContent.split('\n');
                for (let i = 0; i < lines.length - 1; i += 2) {
                    const base64Image = lines[i + 1];
                    try {
                        const decryptedData = decrypt(base64Image, key);
                        if (decryptedData.trim().length > 0) {
                            images.push(decryptedData);
                        }
                    } catch (error) {
                        alertMessage('解密失败，可能是密钥错误');
                        console.error("Decryption error:", error);
                        return;
                    }
                }
                progress++;
                updateProgress((progress / sortedFiles.length) * 100);

                // 处理完所有文件后显示图片
                if (progress === sortedFiles.length) {
                    images.forEach(imageData => {
                        const imgElement = document.createElement('img');
                        imgElement.src = imageData;
                        imgElement.alt = '解密的图片';
                        imageContainer.appendChild(imgElement);
                    });

                    // 询问是否下载
                    if (confirm('解密完成，是否下载解密后的图片？')) {
                        images.forEach((imageData, index) => {
                            const blob = new Blob([imageData], { type: 'image/png' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `image_${index + 1}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        });
                    }

                    updateProgress(0);  // 重置进度条
                }
            };
        } catch (error) {
            console.error("Error reading file:", error);
            alertMessage('读取文件错误，请重试');
            return;
        }
    }
});
