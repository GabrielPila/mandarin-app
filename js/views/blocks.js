import { settings, saveSettings } from "../store.js";
import { $, setView } from "../ui.js";
import { ALL } from "../dict.js";
import { startCram } from "./cards.js";
import { renderStudy } from "./study.js";

export function renderBlocks() {
    const v = setView(`
        <div style="display:flex; align-items:center; margin-bottom:20px;">
            <button id="btn-back-blocks" class="nav-arrow" style="margin-right:16px;">❮</button>
            <h2 style="margin:0;">My Vocabulary Blocks</h2>
        </div>
        <div id="blocks-page-container" style="display:flex; flex-direction:column; gap:12px;"></div>
    `);

    $("#btn-back-blocks").addEventListener("click", () => {
        renderStudy();
    });

    const blocksContainer = $("#blocks-page-container");
    if (!settings.customBlocks || settings.customBlocks.length === 0) {
        blocksContainer.innerHTML = `<p class="empty" style="grid-column: 1 / -1;">You haven't saved any vocabulary blocks yet. Go to the Vocabulary tab to select and save words!</p>`;
        return;
    }

    settings.customBlocks.forEach((block, idx) => {
        // Date parsing (fallback to ID parsing for backward compatibility)
        let ts = block.date;
        if (!ts && block.id && block.id.startsWith("block_")) {
            ts = parseInt(block.id.split("_")[1]);
        }
        const dateStr = ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

        // Extract preview Hanzi
        const previewHanzi = block.dictIds
            .slice(0, 5)
            .map(id => ALL.find(e => e.id === id)?.h)
            .filter(Boolean)
            .join('、');
        const previewStr = previewHanzi + (block.dictIds.length > 5 ? '...' : '');

        const firstChar = block.name.charAt(0).toUpperCase();
        // Generate a subtle color based on the first character
        const hue = firstChar.charCodeAt(0) * 137.508 % 360;
        const bgColor = `hsl(${hue}, 60%, 15%)`;
        const textColor = `hsl(${hue}, 80%, 75%)`;

        const b = document.createElement("div");
        b.className = "block-list-item";
        
        b.innerHTML = `
            <div class="block-icon" style="background:${bgColor}; color:${textColor}; font-weight:bold; font-size:24px;">${firstChar}</div>
            <div class="block-info">
                <div class="block-title">
                    <b>${block.name}</b>
                    <span class="block-date">${dateStr}</span>
                </div>
                <div class="block-preview">
                    <span class="preview-text">${previewStr}</span>
                    <span class="word-count">${block.dictIds.length} words</span>
                </div>
            </div>
            <div class="block-actions">
                <button class="study-block-btn">Study</button>
                <button class="edit-block nav-arrow" title="Rename Block">✎</button>
                <button class="del-block nav-arrow" title="Delete Block">✕</button>
            </div>
        `;
        
        b.addEventListener("click", (e) => {
            if (e.target.closest('.del-block')) {
                e.stopPropagation();
                if (confirm("Delete this block?")) {
                    settings.customBlocks.splice(idx, 1);
                    saveSettings();
                    renderBlocks();
                }
                return;
            }
            if (e.target.closest('.edit-block')) {
                e.stopPropagation();
                const newName = prompt("Enter a new name for this block:", block.name);
                if (newName && newName.trim() !== "" && newName !== block.name) {
                    block.name = newName.trim();
                    saveSettings();
                    renderBlocks();
                }
                return;
            }
            if (e.target.closest('.study-block-btn') || !e.target.closest('.block-actions')) {
                startCram(block.dictIds.map(id => ({ id })));
            }
        });
        blocksContainer.appendChild(b);
    });
}
