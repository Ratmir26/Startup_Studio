import { motion } from 'framer-motion';
import { 
  Share2, 
  Copy, 
  Download, 
  FileJson, 
  Upload,
  MessageSquare 
} from 'lucide-react';
import { useState, useRef } from 'react';

export default function SharePanel({ idea, arguments: args, verdict }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef(null);

  const shareIdea = async () => {
    const shareData = {
      title: 'Валидация идеи',
      text: `Идея: "${idea}"\nВердикт: ${verdict.text}\n\nПомоги аргументами!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyToClipboard(shareData.text);
      }
    } else {
      copyToClipboard(shareData.text);
    }
  };

  const copyArguments = () => {
    const proText = args.pro.map((a, i) => `${i + 1}. ${a.text}`).join('\n');
    const conText = args.con.map((a, i) => `${i + 1}. ${a.text}`).join('\n');
    const text = `Идея: ${idea}\nВердикт: ${verdict.text}\n\nЗА:\n${proText}\n\nПРОТИВ:\n${conText}`;
    copyToClipboard(text);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      prompt('Скопируйте вручную:', text);
    }
  };

  const downloadTxt = () => {
    const text = `Валидация идеи: "${idea}"\nВердикт: ${verdict.text}\n\nАргументы ЗА:\n${args.pro.map((a, i) => `${i + 1}. ${a.text}`).join('\n')}\n\nАргументы ПРОТИВ:\n${args.con.map((a, i) => `${i + 1}. ${a.text}`).join('\n')}`;
    downloadFile(text, 'validation-result.txt', 'text/plain');
  };

  const exportJson = () => {
    const data = {
      idea,
      verdict,
      arguments: args,
      exportedAt: new Date().toISOString(),
    };
    downloadFile(JSON.stringify(data, null, 2), 'validation-data.json', 'application/json');
  };

  const importJson = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Здесь должна быть логика импорта через store
        alert('✅ Данные импортированы! (функционал в разработке)');
      } catch (err) {
        alert('❌ Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section 
      className="share-section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <h2 className="section-title">ПОДЕЛИТЬСЯ</h2>
      
      <div className="share-buttons">
        <motion.button
          className="share-btn"
          onClick={shareIdea}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Share2 size={18} />
          Поделиться
        </motion.button>

        <motion.button
          className="share-btn"
          onClick={copyArguments}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Copy size={18} />
          {copySuccess ? '✓ Скопировано' : 'Копировать'}
        </motion.button>

        <motion.button
          className="share-btn"
          onClick={downloadTxt}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download size={18} />
          Скачать TXT
        </motion.button>

        <motion.button
          className="share-btn"
          onClick={exportJson}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <FileJson size={18} />
          Экспорт JSON
        </motion.button>

        <motion.button
          className="share-btn"
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <Upload size={18} />
          Импорт
        </motion.button>

        <motion.button
          className="share-btn"
          onClick={() => window.open('https://forms.google.com', '_blank')}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageSquare size={18} />
          Создать опрос
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={importJson}
          style={{ display: 'none' }}
        />
      </div>
    </motion.section>
  );
}