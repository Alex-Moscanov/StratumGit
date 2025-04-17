import React, { useState, useEffect } from "react";
import { FiAlignLeft, FiBold, FiItalic, FiList, FiLink, FiImage, FiVideo, FiType } from "react-icons/fi";

const RichTextEditor = ({ initialContent, onChange }) => {
  const [content, setContent] = useState(initialContent || "");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  
  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange(newContent);
    
    setSelection({
      start: e.target.selectionStart,
      end: e.target.selectionEnd
    });
  };

  const insertAtSelection = (before, after = "") => {
    const textarea = document.getElementById("rich-text-editor");
    const start = selection.start;
    const end = selection.end;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      content.substring(end);
    
    setContent(newContent);
    onChange(newContent);
    
    // Set focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const handleBold = () => {
    insertAtSelection("**", "**");
  };

  const handleItalic = () => {
    insertAtSelection("*", "*");
  };

  const handleHeading = () => {
    insertAtSelection("## ");
  };

  const handleList = () => {
    const listItems = content.substring(selection.start, selection.end)
      .split("\n")
      .map(line => line.trim() ? `- ${line}` : line)
      .join("\n");
    
    insertAtSelection("", listItems);
  };

  const handleLink = () => {
    setShowLinkInput(true);
    setLinkText(content.substring(selection.start, selection.end));
  };

  const insertLink = () => {
    if (linkUrl) {
      insertAtSelection(`[${linkText || linkUrl}](${linkUrl})`);
      setShowLinkInput(false);
      setLinkUrl("");
      setLinkText("");
    }
  };

  const handleImage = () => {
    insertAtSelection("![Image description](image-url)");
  };

  const handleVideo = () => {
    insertAtSelection("[![Video thumbnail](video-thumbnail-url)](video-url)");
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-100 p-2 flex flex-wrap gap-1 border-b">
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleBold}
          title="Bold"
        >
          <FiBold />
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleItalic}
          title="Italic"
        >
          <FiItalic />
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleHeading}
          title="Heading"
        >
          <FiType />
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleList}
          title="List"
        >
          <FiList />
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleLink}
          title="Link"
        >
          <FiLink />
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleImage}
          title="Image"
        >
          <FiImage />
        </button>
        <button
          type="button"
          className="p-2 rounded hover:bg-gray-200"
          onClick={handleVideo}
          title="Video"
        >
          <FiVideo />
        </button>
      </div>
      
      {/* Link Input */}
      {showLinkInput && (
        <div className="p-2 bg-gray-50 border-b flex items-center space-x-2">
          <input
            type="text"
            placeholder="Link text"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            className="p-1 border rounded flex-1"
          />
          <input
            type="text"
            placeholder="URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="p-1 border rounded flex-1"
          />
          <button
            type="button"
            className="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={insertLink}
          >
            Insert
          </button>
          <button
            type="button"
            className="px-2 py-1 bg-gray-300 rounded"
            onClick={() => setShowLinkInput(false)}
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Editor */}
      <textarea
        id="rich-text-editor"
        value={content}
        onChange={handleContentChange}
        className="w-full h-64 p-3 focus:outline-none"
        placeholder="Enter your content here..."
        onSelect={(e) => {
          setSelection({
            start: e.target.selectionStart,
            end: e.target.selectionEnd
          });
        }}
      />
      
      {/* Preview */}
      <div className="border-t p-3">
        <div className="text-sm font-medium text-gray-500 mb-2">Preview:</div>
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: content
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>')
              .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
              .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;" />')
              .replace(/- (.*?)(?:\n|$)/g, '<li>$1</li>')
              .replace(/<li>(.*?)<\/li>/g, '<ul>$&</ul>')
              .replace(/<\/ul><ul>/g, '')
              .replace(/\n/g, '<br />')
          }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
