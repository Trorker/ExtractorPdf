// ===== Globals from vendor scripts =====
const Swal = window.Swal;
const pdfjsLib = window.pdfjsLib;
const { PDFDocument, rgb, degrees, PageSizes } = window.PDFLib;

// fontkit UMD: in alcune build è window.fontkit, in altre window.fontkit.default
const fontkit = window.fontkit?.default || window.fontkit;

// ===== Helpers =====
function toU8(data) {
    if (!data) return new Uint8Array();
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    // caso raro: array-like
    return new Uint8Array(data);
}

// ===== Toast & Error =====
const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true
});

function ErrorAlert(text) {
    return Swal.fire({ icon: "error", title: "Oops...", text });
}

// ===== App info (da package.json) + lista libs =====
async function getAppInfo() {
    const pkg = await window.api.readPackageJson();
    return {
        name: pkg.build?.productName || pkg.productName || pkg.name || "Extractor PDF",
        version: pkg.version || "0.0.0",
        author: (typeof pkg.author === "string" ? pkg.author : (pkg.author?.name || "Ruslan Dzyuba")),
        repository: (typeof pkg.repository === "string" ? pkg.repository : (pkg.repository?.url || "")),
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {}
    };
}

function normalizeRepoUrl(repoUrl) {
    if (!repoUrl) return "";
    return repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");
}

function semverCompare(a, b) {
    const pa = String(a).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        if (pa[i] > pb[i]) return 1;
        if (pa[i] < pb[i]) return -1;
    }
    return 0;
}

// ===== About / License / OpenSource / Update =====
async function License() {
    const info = await getAppInfo();
    await Swal.fire({
        title: "License",
        html: `<p style="text-align: justify;">
      MIT License
      <br><br>Copyright (c) ${new Date().getFullYear()} ${info.author}
      <br><br>Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal in
      the Software without restriction, including without limitation the rights to use,
      copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
      and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
      <br><br>The above copyright notice and this permission notice shall be included in all copies
      or substantial portions of the Software.
      <br><br>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
      INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE
      AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
      DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    </p>`,
        showConfirmButton: false,
        showCloseButton: true
    });
}

async function OpenSource() {
    const info = await getAppInfo();
    const all = { ...info.dependencies, ...info.devDependencies };

    const items = Object.keys(all)
        .sort((a, b) => a.localeCompare(b))
        .map(name => {
            const ver = all[name];
            const url = `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
            return `<li><a href="#" data-url="${url}">${name}</a> <span style="opacity:.7">${ver}</span></li>`;
        })
        .join("");

    await Swal.fire({
        title: "Open-Source resources used",
        html: `
      <p style="text-align: justify;">
        In order to develop the <b>${info.name}</b> project, external libraries have been employed.
        <br><br>Below is a comprehensive list of the libraries utilized:
        <ul style="text-align:left; margin-top:10px;">${items}</ul>
      </p>
    `,
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            document.querySelectorAll("[data-url]").forEach(a => {
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    const url = a.getAttribute("data-url");
                    window.api.openExternal(url);
                });
            });
        }
    });
}

async function CheckUpdate() {
    const info = await getAppInfo();
    const owner = "Trorker";
    const repo = "ExtractorPdf";

    Swal.fire({
        title: "Controllo aggiornamenti...",
        allowOutsideClick: false,
        didOpen: async () => {
            Swal.showLoading();
            try {
                const data = await window.api.checkUpdate(owner, repo);
                const latestTag = data.tag_name || data.name || "";
                const current = info.version;

                const cmp = semverCompare(latestTag, current);

                if (cmp > 0) {
                    Swal.update({
                        icon: "info",
                        title: "Aggiornamento disponibile",
                        html: `
              <div style="text-align:left">
                Versione attuale: <b>${current}</b><br>
                Ultima release: <b>${latestTag}</b><br><br>
                <button id="btn-open-release" class="swal2-confirm swal2-styled">Apri pagina release</button>
              </div>
            `,
                        showConfirmButton: false,
                        showCloseButton: true
                    });

                    setTimeout(() => {
                        const btn = document.getElementById("btn-open-release");
                        if (btn) btn.addEventListener("click", () => window.api.openExternal(data.html_url));
                    }, 0);
                } else {
                    Swal.update({
                        icon: "success",
                        title: "Sei aggiornato",
                        text: `Stai usando l'ultima versione (${current}).`,
                        showConfirmButton: false,
                        showCloseButton: true
                    });
                }
            } catch (err) {
                Swal.update({
                    icon: "error",
                    title: "Errore update check",
                    text: `Impossibile contattare GitHub: ${err.message}`,
                    showConfirmButton: false,
                    showCloseButton: true
                });
            }
        }
    });
}

async function about() {
    const info = await getAppInfo();
    const avatarUrl = new URL("./assets/avatar.jpeg", document.baseURI).toString();

    await Swal.fire({
        showConfirmButton: false,
        showCloseButton: true,
        imageUrl: avatarUrl,
        imageWidth: 100,
        imageHeight: 100,
        imageAlt: "Avatar",
        willOpen: () => {
            Swal.update({
                title: "About",
                html: `
          <h3 style="margin:0">
            <b>${info.name}</b><br>
            <i>by&nbsp;&nbsp;</i><b>${info.author}</b>
          </h3>
          <div style="font-size: 0.9em; margin-top:10px">
            <i>Version:&nbsp;${info.version}</i><br><br>
            <a href="#" id="OpenSource"><i>Open-Source resources used</i></a><br>
            <a href="#" id="License"><i>License</i></a><br>
            <a href="#" id="CheckUpdate"><i>Check update</i></a>
          </div>
          <br>
        `
            });
        },
        didOpen: () => {
            document.getElementById("OpenSource").addEventListener("click", (e) => { e.preventDefault(); OpenSource(); });
            document.getElementById("License").addEventListener("click", (e) => { e.preventDefault(); License(); });
            document.getElementById("CheckUpdate").addEventListener("click", (e) => { e.preventDefault(); CheckUpdate(); });
        }
    });
}

// ===== Utils =====
function jsonToCsv(items, char = ";") {
    if (!items?.length) return "";
    const replacer = (_k, v) => (v === null ? "" : v);
    const header = Object.keys(items[0]);
    return [
        header.join(char),
        ...items.map(row => header.map(f => JSON.stringify(row[f], replacer)).join(char))
    ].join("\r\n");
}

async function pickAndReadPdfs() {
    const paths = await window.api.pickPdfFiles();
    if (!paths?.length) return [];
    const files = [];
    for (const p of paths) {
        const ab = await window.api.readFile(p); // ArrayBuffer
        files.push({ path: p, result: ab });
    }
    return files;
}

async function mergeAllPDFs(files) {
    const merged = await PDFDocument.create();
    for (const f of files) {
        const loaded = await PDFDocument.load(toU8(f.result));
        const copied = await merged.copyPages(loaded, loaded.getPageIndices());
        copied.forEach(page => merged.addPage(page));
    }
    return await merged.save(); // Uint8Array
}

// ===== Page Editor (render + selezione) =====
let pageSelected = [];           // usata sia da ST editor swal (se lo lasci) sia dalla home
let editorMergedBytes = null;    // Uint8Array
let editorLoadedDoc = null;      // PDFDocument

function setHomeStatus(html) {
    const el = document.getElementById("home-status");
    if (el) el.innerHTML = html || "";
}

function showHomeActions(show) {
    const bar = document.getElementById("home-actions");
    if (!bar) return;
    bar.style.display = show ? "flex" : "none";
}

function clearHomeEditor() {
    pageSelected = [];
    editorMergedBytes = null;
    editorLoadedDoc = null;

    const cont = document.getElementById("container-page");
    if (cont) cont.innerHTML = "";

    setHomeStatus("");
    showHomeActions(false);
}

function selectPage(e) {
    const pageDiv = e.currentTarget;
    pageDiv.classList.toggle("select");
    const id = parseInt(pageDiv.dataset.page, 10);

    if (pageSelected.includes(id)) {
        pageSelected = pageSelected.filter(x => x !== id);
        pageDiv.querySelector(".n-page").textContent = "";
    } else {
        pageSelected.push(id);
    }

    document.querySelectorAll(".page").forEach(div => {
        const pid = parseInt(div.dataset.page, 10);
        const idx = pageSelected.indexOf(pid);
        div.querySelector(".n-page").textContent = idx >= 0 ? `${idx + 1}/${pageSelected.length}` : "";
    });

    setHomeStatus(`Selezionate: <b>${pageSelected.length}</b> pagine`);
}

async function renderPages(containerEl, arrayBufferOrU8) {
    // reset container (se lo vuoi)
    containerEl.innerHTML = "";

    const pdf = await pdfjsLib.getDocument({ data: arrayBufferOrU8 }).promise;
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);

        const pageDiv = document.createElement("div");
        pageDiv.className = "page";
        pageDiv.dataset.page = String(i);
        pageDiv.addEventListener("click", selectPage);

        const canvas = document.createElement("canvas");
        canvas.className = "canvas-page";

        const n = document.createElement("span");
        n.className = "n-page";

        pageDiv.appendChild(canvas);
        pageDiv.appendChild(n);
        containerEl.appendChild(pageDiv);

        const scale = 0.35;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (viewport.width > viewport.height) pageDiv.classList.add("horizontal");

        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvas.style.filter = "blur(0px)";
    }
}

// ===== HOME MINIMAL PAGE EDITOR (drag&drop in pagina) =====
async function loadPdfPathsIntoHomeEditor(paths) {
    if (!paths?.length) return;

    clearHomeEditor();
    setHomeStatus("Caricamento PDF...");

    const files = [];
    for (const p of paths) {
        const ab = await window.api.readFile(p); // ArrayBuffer
        files.push({ path: p, result: ab });
    }

    editorMergedBytes = await mergeAllPDFs(files); // Uint8Array
    editorLoadedDoc = await PDFDocument.load(toU8(editorMergedBytes));
    pageSelected = [];

    setHomeStatus(`File: <b>${files.length}</b> — Pagine totali: <b>${editorLoadedDoc.getPageCount()}</b>`);
    showHomeActions(true);

    const cont = document.getElementById("container-page");
    await renderPages(cont, editorMergedBytes);
}

async function loadPdfFilesIntoHomeEditor(files /* Array<File> */) {
    if (!files?.length) return;

    clearHomeEditor();
    setHomeStatus("Caricamento PDF...");

    const read = [];
    for (const f of files) {
        const ab = await f.arrayBuffer(); // <-- qui non serve path!
        read.push({ path: f.name || "file.pdf", result: ab });
    }

    editorMergedBytes = await mergeAllPDFs(read); // Uint8Array
    editorLoadedDoc = await PDFDocument.load(toU8(editorMergedBytes));
    pageSelected = [];

    setHomeStatus(`File: <b>${read.length}</b> — Pagine totali: <b>${editorLoadedDoc.getPageCount()}</b>`);
    showHomeActions(true);

    const cont = document.getElementById("container-page");
    await renderPages(cont, editorMergedBytes);
}


async function exportHomeSelection() {
    if (!editorLoadedDoc || !editorMergedBytes) {
        Toast.fire({ icon: "error", title: "Carica prima uno o più PDF" });
        return;
    }
    if (pageSelected.length <= 0) {
        Toast.fire({ icon: "error", title: "Seleziona almeno una pagina" });
        return;
    }

    const outFolder = await window.api.pickOutputFolder();
    if (!outFolder) return;

    const out = await PDFDocument.create();
    const copied = await out.copyPages(editorLoadedDoc, pageSelected.map(n => n - 1));
    copied.forEach(p => out.addPage(p));

    const b64 = await out.saveAsBase64({ dataUri: false });
    const fileName = `PageEditor_${new Date().toISOString().slice(0, 10)}.pdf`;
    await window.api.saveBase64ToFolder(outFolder, fileName, b64);

    Toast.fire({ icon: "success", title: "PDF esportato" });
}

function initHomePageEditor() {
    const drop = document.getElementById("home-drop");
    const btnPick = document.getElementById("home-pick");
    const btnClear = document.getElementById("home-clear");
    const btnExport = document.getElementById("home-export");

    if (!drop || !btnPick || !btnClear || !btnExport) {
        console.warn("Home Page Editor: elementi DOM mancanti. Hai aggiornato index.html?");
        return;
    }

    // dragover
    drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("active");
    });

    drop.addEventListener("dragleave", (e) => {
        e.preventDefault();
        drop.classList.remove("active");
    });

    // drop
    drop.addEventListener("drop", async (e) => {
        e.preventDefault();
        drop.classList.remove("active");

        const files = Array.from(e.dataTransfer?.files || []);
        if (!files.length) {
            Toast.fire({ icon: "error", title: "Nessun file rilevato" });
            return;
        }

        // accetta pdf per mimetype oppure estensione
        const pdfFiles = files.filter(f => {
            const name = String(f.name || "").toLowerCase();
            const isPdfByName = name.endsWith(".pdf");
            const isPdfByType = String(f.type || "").toLowerCase() === "application/pdf";
            return isPdfByName || isPdfByType;
        });

        if (!pdfFiles.length) {
            Toast.fire({ icon: "error", title: "Trascina solo file PDF" });
            return;
        }

        await loadPdfFilesIntoHomeEditor(pdfFiles);
    });



    // picker
    btnPick.addEventListener("click", async () => {
        const paths = await window.api.pickPdfFiles();
        if (!paths?.length) return;
        await loadPdfPathsIntoHomeEditor(paths);
    });

    // clear
    btnClear.addEventListener("click", () => {
        clearHomeEditor();
        Toast.fire({ icon: "success", title: "Pulito" });
    });

    // export
    btnExport.addEventListener("click", exportHomeSelection);

    // default state
    clearHomeEditor();
}

// ===== Estrazione per coordinate =====
async function getPageTextByPdf(pageNum, dataBytes /* Uint8Array */, select) {
    const searchTable = {
        ID: {
            RPC: { X: 482.97599999999994, Y: 684.328 },
            New_RPC: { X: 537.722005, Y: 703.0051499999997 },
            ST: { X: 493.37, Y: 675.23 },
            ST_211: { X: 476.55, Y: 696.81 }
        },
        Name: {
            RPC: { X: 391.176, Y: 609.664 },
            New_RPC: { X: 87.73100499999991, Y: 687.3531499999997 },
            ST: { X: 106.9, Y: 594.31 },
            ST_211: { X: 112.11, Y: 652.17 }
        },
        TipoLavoro: {
            RPC: { X: 302.976, Y: 684.472 },
            New_RPC: { X: 244.6649949999999, Y: 703.0051499999997 },
            ST: { X: 293.49, Y: 681.7600000000001 },
            ST_211: { X: 40.43, Y: 716.4200000000001 }
        },
        oldFasi: {
            RPC: { X: 297.57599999999996, Y: 561.712 },
            New_RPC: { X: 370.47400899999985, Y: 592.6611499999998 },
            ST: { X: 290.6, Y: 560.35 },
            ST_211: { X: 540.14, Y: 538.25 }
        },
        oldPotenza: {
            RPC: { X: 470.52, Y: 548.9680000000001 },
            New_RPC: { X: 385.80600899999985, Y: 583.7171499999998 },
            ST: { X: 456.22, Y: 548.12 },
            ST_211: { X: 369.17, Y: 538.25 }
        },
        newFasi: {
            RPC: { X: 297.57599999999996, Y: 513.2560000000001 },
            New_RPC: { X: 370.4740089999999, Y: 553.1791499999998 },
            ST: { X: 292.13, Y: 511.3 },
            ST_211: { X: 540.3, Y: 595.4200000000001 }
        },
        newPotenza: {
            RPC: { X: 470.52, Y: 499.93600000000004 },
            New_RPC: { X: 385.8060089999999, Y: 543.9791499999998 },
            ST: { X: 456.22, Y: 499.48 },
            ST_211: { X: 370.75, Y: 595.4200000000001 }
        },
        POD: {
            RPC: { X: null, Y: null },
            New_RPC: { X: null, Y: null },
            ST: { X: 466.06, Y: 649.4000000000001 },
            ST_211: { X: null, Y: null }
        }
    };

    const pdf = await pdfjsLib.getDocument({ data: dataBytes }).promise;
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const result = {
        ID: null, Name: null, POD: null,
        TipoLavoro: null, oldFasi: null, oldPotenza: null, newFasi: null, newPotenza: null
    };

    for (const key of Object.keys(searchTable)) {
        const { X, Y } = searchTable[key][select];
        if (X == null || Y == null) { result[key] = null; continue; }
        const found = textContent.items.find(obj => obj.transform?.[4] === X && obj.transform?.[5] === Y);
        result[key] = found ? found.str : null;
    }

    return result;
}

// ===== Firma + allegati (tutto locale) =====
// MODIFICA IN-PLACE: NON ritorna bytes, modifica il pdfDoc e basta.
async function modifyPdf(pdfDoc, result, extra, select) {
    if (!fontkit) throw new Error("fontkit non disponibile (vendor/fontkit.umd.min.js non caricato?)");

    // font
    const fontAB = await window.api.readAsset("fonts/IndieFlower-Regular.ttf");
    const fontBytes = toU8(fontAB);

    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);

    const size = 14;
    const font = customFont;
    const color = rgb(0.1, 0.1, 0.95);
    const rotate = degrees(0);

    let pages = pdfDoc.getPages();

    // protezione: se il documento non ha abbastanza pagine, evita crash
    if (pages.length < 5) return;

    const firstPage = pages[2];
    const pxSpaceModelloST = 47;
    const pxSpaceModelloST_211 = (select === "ST_211") ? 9 : 0;

    firstPage.drawText(extra.Tel, { x: 58, y: 262 - pxSpaceModelloST - pxSpaceModelloST_211, size, font, color, rotate });
    firstPage.drawText("08:30", { x: 367, y: 262 - pxSpaceModelloST - pxSpaceModelloST_211, size, font, color, rotate });
    firstPage.drawText("16:00", { x: 464, y: 262 - pxSpaceModelloST - pxSpaceModelloST_211, size, font, color, rotate });
    firstPage.drawText(extra.Name, { x: 280, y: 222 - pxSpaceModelloST - pxSpaceModelloST_211, size, font, color, rotate });

    const secondPage = pages[4];
    secondPage.drawText(extra.Tel, { x: 58, y: 261 - pxSpaceModelloST, size, font, color, rotate });
    secondPage.drawText("08:30", { x: 367, y: 261 - pxSpaceModelloST, size, font, color, rotate });
    secondPage.drawText("16:00", { x: 464, y: 261 - pxSpaceModelloST, size, font, color, rotate });
    secondPage.drawText(extra.Name, { x: 280, y: 221 - pxSpaceModelloST, size, font, color, rotate });

    // Allegato A
    if (extra?.Allegato_A) {
        const bytesAAB = await window.api.readAsset("allegati/9f3c2a1.bin");
        const docA = await PDFDocument.load(toU8(bytesAAB));
        const idxs = docA.getPages().map((_, i) => i);
        const copied = await pdfDoc.copyPages(docA, idxs);

        copied.forEach(p => {
            p.drawText(result.ID || "", { x: 160, y: 775, size: 18, font, color, rotate });
            p.drawText(result.Name || "", { x: 430, y: 775, size: 12, font, color, rotate });
            p.drawText(result.POD || "", { x: 290, y: 50, size: 16, font, color, rotate });
            pdfDoc.addPage(p);
        });
    }

    // Allegato B
    if (extra?.Allegato_B) {
        const bytesBAB = await window.api.readAsset("allegati/72aa10c.bin");
        const docB = await PDFDocument.load(toU8(bytesBAB));
        const idxs = docB.getPages().map((_, i) => i);
        const copied = await pdfDoc.copyPages(docB, idxs);

        copied.forEach((p, i) => {
            if (i === 3) pdfDoc.addPage(PageSizes.A7);
            p.drawText(result.ID || "", { x: 160, y: 775, size: 18, font, color, rotate });
            p.drawText(result.Name || "", { x: 430, y: 775, size: 12, font, color, rotate });
            p.drawText(result.POD || "", { x: 305, y: 65, size: 16, font, color, rotate });
            pdfDoc.addPage(p);
        });

        pdfDoc.addPage(PageSizes.A7);
    }
}

// ===== Core: Extract PDF =====
async function extractPdf(arrayBytes /* Uint8Array|ArrayBuffer */, select, checked, extra) {
    const results = [];

    const src = await PDFDocument.load(toU8(arrayBytes));
    const pages = src.getPages();
    const step = (select === "RPC" || select === "New_RPC") ? 2 : 6;

    const outFolder = await window.api.pickOutputFolder();
    if (!outFolder) return;

    for (let i = 0; i < pages.length; i += step) {
        const out = await PDFDocument.create();

        if (step === 2) {
            const idx = [i, i + 1].filter(n => n < pages.length);
            const copied = await out.copyPages(src, idx);
            copied.forEach(p => out.addPage(p));
        } else {
            const idx = [i, i + 1, i + 2, i + 3, i + 4, i + 5].filter(n => n < pages.length);
            const copied = await out.copyPages(src, idx);
            copied.forEach(p => out.addPage(p));
        }

        const outBytes = await out.save();
        const meta = await getPageTextByPdf(1, outBytes, select);

        if (!meta.ID) {
            await ErrorAlert("Nessun Codice Rintracciabilità trovato!");
            return;
        }

        results.push(meta);

        if (checked) {
            await modifyPdf(out, meta, extra, select);
        }

        const baseName = (select === "RPC" || select === "New_RPC") ? "Preventivo" : "Specifica Tecnica";
        const fileName = `${baseName}_${meta.ID} - ${(meta.Name || "SenzaNome")}.pdf`;
        const safeName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

        const b64 = await out.saveAsBase64({ dataUri: false });
        await window.api.saveBase64ToFolder(outFolder, safeName, b64);
    }

    Toast.fire({ icon: "success", title: "Operazione completata" });

    const rep = results.map(r => `<div style="text-align:left"><b>${r.ID}</b> (${r.Name || ""})</div>`).join("");
    const clipboard = results.map(r => r.ID).join("\n");

    const r = await Swal.fire({
        title: "Report",
        html: rep,
        showCancelButton: true,
        confirmButtonText: "Copy to clipboard",
        cancelButtonText: "Chiudi"
    });

    if (r.isConfirmed) {
        try {
            await navigator.clipboard.writeText(clipboard);
            Toast.fire({ icon: "success", title: "Copiato negli appunti" });
        } catch {
            Toast.fire({ icon: "error", title: "Clipboard non disponibile" });
        }
    }
}

// ===== UI Actions =====
async function extractST(select /* "ST" | "ST_211" */) {
    const files = await pickAndReadPdfs();
    if (!files.length) return;

    const mergedBytes = await mergeAllPDFs(files); // Uint8Array

    const ask = await Swal.fire({
        title: "Firma la Specifica Tecnica?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sì",
        cancelButtonText: "No"
    });

    let sign = ask.isConfirmed;
    let extra = null;

    let saved = { Name: "", Tel: "" };
    try {
        const raw = localStorage.getItem("STform");
        if (raw) saved = JSON.parse(raw);
    } catch { }

    if (sign) {
        const stForm = await Swal.fire({
            title: "Compila Specifica Tecnica",
            html:
                `<input id="swal-input-name" class="swal2-input" placeholder="Nome Tecnico" value="${saved.Name || ""}">` +
                `<input id="swal-input-tel" class="swal2-input" placeholder="Telefono" value="${saved.Tel || ""}">` +
                '<label class="swal2-checkbox" style="display:flex;"><input type="checkbox" id="alA"><span class="swal2-label">Allegato A</span></label>' +
                '<label class="swal2-checkbox" style="display:flex;"><input type="checkbox" id="alB"><span class="swal2-label">Allegato B</span></label>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "OK",
            preConfirm: () => {
                const Name = document.getElementById("swal-input-name").value.trim();
                const Tel = document.getElementById("swal-input-tel").value.trim();
                if (!Name || !Tel) Swal.showValidationMessage("Inserire dati");
                const Allegato_A = document.getElementById("alA").checked;
                const Allegato_B = document.getElementById("alB").checked;
                return { Name, Tel, Allegato_A, Allegato_B };
            }
        });

        if (!stForm.isConfirmed) sign = false;
        else {
            extra = stForm.value;
            localStorage.setItem("STform", JSON.stringify({ Name: extra.Name, Tel: extra.Tel }));
        }
    }

    await extractPdf(mergedBytes, select, sign, extra);
}

// ===== Legacy pageEditor (non usato più) =====
async function pageEditor() {
    Toast.fire({ icon: "info", title: "Page Editor ora è nella schermata principale (drag & drop)" });
}

// ===== Bind Buttons =====
document.getElementById("btn-st").addEventListener("click", () => extractST("ST"));
document.getElementById("btn-st211").addEventListener("click", () => extractST("ST_211"));
document.getElementById("btn-about").addEventListener("click", about);

// init home editor
initHomePageEditor();
