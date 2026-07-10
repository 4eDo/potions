// ==================== КОНФИГУРАЦИЯ И ШАБЛОНЫ ====================
 
var potionsSrc = "https://4edo.github.io/potions/data.json?v=1";

const RARE_TEXTS = {
    0: "Не найти в природе",
    1: "Очень редкое",
    2: "Редкое",
    3: "Обычное",
    4: "Частое",
    5: "Повсеместное"
};

const FIND_TEXTS = {
    "greenhouse": "теплица/оранжерея",
    "wild": "дикая природа",
    "cultivated": "культивируется"
};

const DIFFICULTY_TEXTS = {
    0: "Не применимо",
    1: "Элементарно, справится даже ребёнок.",
    2: "Достаточно просто, справится домохозяйка.",
    3: "Средне, придётся постараться.",
    4: "Сложно, требуется большой опыт.",
    5: "Очень сложно, работа для мастера."
};

const TAG_ICONS = {
    "исчерпаемый": { icon: "warning", title: "Исчерпаемый" },
    "органическое": { icon: "recycling", title: "Органическое" },
    "минеральное": { icon: "diamond", title: "Минеральное" },
    "синтезируемое": { icon: "experiment", title: "Синтезируемое" },
    "животное": { icon: "pet_supplies", title: "Животное" },
    "растительное": { icon: "temp_preferences_eco", title: "Растительное" }
};

const TEMPLATE_CARD = `<div>
	<h3>{{NAME}}</h3>
	{{LATIN}}
	{{OTHER_NAMES}}
	{{RARE}}
	<h4>Вид:</h4>
	<p>{{FORM}}</p>
	<h4>Описание:</h4>
	<p>{{DESCRIPTION}}</p>
	<h4>Используемые части:</h4>
	<p>{{PARTS}}</p>
	{{FIND}}
	<h4>Химический состав:</h4>
	<p>{{COMPOSITION}}</p>
	{{DIFFICULTY}}
	<h4>Действие:</h4>
	<p>{{ACTIONS}}</p>
	<h4>Состав:</h4>
	<p>{{NEEDED}}</p>
	{{RECIPE}}
	{{TAGS}}
	{{INCLUDES_LIST}}
</div>`;

// ==================== ГЛОБАЛЬНЫЕ ДАННЫЕ И ИНДЕКСЫ ====================

var potions = [];
var potionsByName = new Map();
var ingredientToPotions = {};
var allTags = [];
var allActions = [];
var allComposition = [];
var allFind = ["greenhouse", "wild", "cultivated"];

// ==================== ЗАГРУЗКА ДАННЫХ ====================

async function loadPotions() {
    const response = await fetch(potionsSrc);
    potions = await response.json();
    potions.sort((a, b) => a.name.localeCompare(b.name));

    buildIndices();
    
    renderSidebar(potions);
    renderFilters();
    addSearchField();
    
    applyFiltersFromURL();
    
    return true;
}

function buildIndices() {
    const tagsSet = new Set();
    const actionsSet = new Set();
    const compositionSet = new Set();
    
    potions.forEach(potion => {
        potionsByName.set(potion.name.toLowerCase(), potion);
        potion.otherNames?.forEach(alias => 
            potionsByName.set(alias.toLowerCase(), potion)
        );
        
        if (potion.neededList) {
            potion.neededList.forEach(ingredient => {
                const primoName = getPrimoName(ingredient) || ingredient;
                const key = primoName.toLowerCase();
                if (!ingredientToPotions[key]) ingredientToPotions[key] = [];
                ingredientToPotions[key].push(potion.name);
            });
        }
        
        potion.tags?.forEach(t => tagsSet.add(t));
        potion.actions?.forEach(a => actionsSet.add(a));
        potion.composition?.forEach(c => compositionSet.add(c));
    });
    
    allTags = [...tagsSet].sort();
    allActions = [...actionsSet].sort();
    allComposition = [...compositionSet].sort();
}

function getPrimoName(ingredientName) {
    const found = potionsByName.get(ingredientName.toLowerCase());
    return found ? found.name : null;
}

// ==================== ТЕМА ====================

function toggleTheme() {
    document.body.classList.toggle('night');
    const icon = document.getElementById('themeToggle');
    if (document.body.classList.contains('night')) {
        icon.textContent = 'light_mode';
        localStorage.setItem('theme', 'night');
    } else {
        icon.textContent = 'dark_mode';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'night') {
        document.body.classList.add('night');
        document.getElementById('themeToggle').textContent = 'light_mode';
    }
}

// ==================== МАРКЕРЫ ====================

function getMarkers(potion) {
    const markers = [];
    
    if (potion.isIngr) {
        markers.push('<span class="material-symbols-outlined canonMarker" title="Ингредиент">extension</span>');
    }
    if (potion.isPotion) {
        markers.push('<span class="material-symbols-outlined canonMarker" title="Продукт">category</span>');
    }
    
    (potion.tags || []).forEach(tag => {
        const iconData = TAG_ICONS[tag];
        if (iconData) {
            markers.push(`<span class="material-symbols-outlined canonMarker" title="${iconData.title}">${iconData.icon}</span>`);
        }
    });
    
    return markers.join('');
}

function getRareMarker(potion) {
    const rare = potion.rare ?? 0;
    if (rare == 0) return '';
    return `<span class="material-symbols-outlined rareMarker" title="${RARE_TEXTS[rare] || 'Не определено'}">counter_${rare}</span>`;
}

function getDifficultyMarker(potion) {
    const diff = potion.difficulty ?? 0;
    if (diff == 0) return '';
    return `<span class="material-symbols-outlined diffMarker" title="${DIFFICULTY_TEXTS[diff] || 'Не определено'}">counter_${diff}</span>`;
}

// ==================== РЕНДЕРИНГ САЙДБАРА ====================

function renderSidebar(potionsList) {
    const sidebar = potionsList.map(potion => {
        const markers = getMarkers(potion);
        const rareMarker = getRareMarker(potion);
        const diffMarker = getDifficultyMarker(potion);
        return `<li data-name="${potion.name}" onclick="showMe('${potion.name}')">
            <span class="canonMarkers">${markers}</span>
            <span class="itemName">${potion.name}</span>
            <span class="rightMarkers">${rareMarker}${diffMarker}</span>
        </li>`;
    }).join('');
    
    document.getElementById("relList").innerHTML = sidebar;
}

// ==================== РЕНДЕРИНГ ФИЛЬТРОВ ====================

function renderFilters() {
    createDatalistFilter("actCell", "inpAct", "datalistAct", allActions);
    createDatalistFilter("tagsCell", "inpTags", "datalistTags", allTags);
    createFindFilter("findCell", "inpFind", "datalistFind");
    createDatalistFilter("compCell", "inpComp", "datalistComp", allComposition);
    
    const selPot = document.getElementById("selPot");
    if (selPot) {
        selPot.addEventListener('change', doFilter);
    }
}

function createDatalistFilter(containerId, inputId, datalistId, options) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const input = document.createElement('input');
    input.id = inputId;
    input.setAttribute('list', datalistId);
    input.setAttribute('placeholder', 'Поиск...');
    input.addEventListener('change', doFilter);
    input.addEventListener('input', doFilter);
    
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    datalist.innerHTML = '<option value="Показать всё" />' + 
        options.map(opt => `<option value="${opt}" />`).join('');
    
    container.appendChild(input);
    container.appendChild(datalist);
}

function createFindFilter(containerId, inputId, datalistId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const input = document.createElement('input');
    input.id = inputId;
    input.setAttribute('list', datalistId);
    input.setAttribute('placeholder', 'Места...');
    input.addEventListener('change', doFilter);
    
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    datalist.innerHTML = '<option value="Показать всё" />' + 
        allFind.map(opt => `<option value="${FIND_TEXTS[opt]}" />`).join('');
    
    container.appendChild(input);
    container.appendChild(datalist);
}

function addSearchField() {
    const searchCell = document.getElementById("searchCell");
    if (!searchCell) return;
    
    searchCell.innerHTML = '';
    const input = document.createElement('input');
    input.id = "inpSearch";
    input.setAttribute('placeholder', 'Поиск по названию...');
    input.addEventListener('input', doFilter);
    
    searchCell.appendChild(input);
}

// ==================== ФИЛЬТРАЦИЯ ====================

function doFilter() {
    const searchText = (document.getElementById("inpSearch")?.value || '').toLowerCase();
    const selectedTag = document.getElementById("inpTags")?.value || '';
    const selectedAct = document.getElementById("inpAct")?.value || '';
    const selectedFind = document.getElementById("inpFind")?.value || '';
    const selectedComp = document.getElementById("inpComp")?.value || '';
    const selectedType = document.getElementById("selPot")?.value || '';
    
    const findKey = Object.entries(FIND_TEXTS).find(([_, v]) => v === selectedFind)?.[0] || '';
    
    let shown = 0, hidden = 0;
    
    const listItems = potions.map(potion => {
        const matchesSearch = !searchText || 
            potion.name.toLowerCase().includes(searchText) ||
            potion.latin?.toLowerCase().includes(searchText) ||
            potion.otherNames?.some(n => n.toLowerCase().includes(searchText));
        
        const passesTag = !selectedTag || selectedTag === "Показать всё" || 
                         potion.tags?.includes(selectedTag);
        const passesAct = !selectedAct || selectedAct === "Показать всё" || 
                         potion.actions?.includes(selectedAct);
        const passesFind = !findKey || potion.find?.includes(findKey);
        const passesComp = !selectedComp || selectedComp === "Показать всё" || 
                          potion.composition?.includes(selectedComp);
        
        let passesType = true;
        if (selectedType === "ingr") {
            passesType = potion.isIngr === true;
        } else if (selectedType === "potions") {
            passesType = potion.isPotion === true;
        }
        
        const visible = matchesSearch && passesTag && passesAct && passesFind && passesComp && passesType;
        
        if (visible) {
            shown++;
        } else {
            hidden++;
        }
        
        const markers = getMarkers(potion);
        const rareMarker = getRareMarker(potion);
        const diffMarker = getDifficultyMarker(potion);
        
        return `<li style="${visible ? '' : 'display: none;'}" data-name="${potion.name}" 
                    onclick="showMe('${potion.name}')">
            <span class="canonMarkers">${markers}</span>
            <span class="itemName">${potion.name}</span>
            <span class="rightMarkers">${rareMarker}${diffMarker}</span>
        </li>`;
    }).join('');
    
    document.getElementById("relList").innerHTML = listItems;
    updateStatus(shown, hidden, potions.length);
    updateURL();
}

// ==================== URL-ПАРАМЕТРЫ ====================

function updateURL() {
    const params = new URLSearchParams();
    
    const searchText = document.getElementById("inpSearch")?.value || '';
    const selectedTag = document.getElementById("inpTags")?.value || '';
    const selectedAct = document.getElementById("inpAct")?.value || '';
    const selectedFind = document.getElementById("inpFind")?.value || '';
    const selectedComp = document.getElementById("inpComp")?.value || '';
    const selectedType = document.getElementById("selPot")?.value || '';
    
    if (searchText) params.set("search", searchText);
    if (selectedTag && selectedTag !== "Показать всё") params.set("tag", selectedTag);
    if (selectedAct && selectedAct !== "Показать всё") params.set("action", selectedAct);
    if (selectedFind && selectedFind !== "Показать всё") params.set("find", selectedFind);
    if (selectedComp && selectedComp !== "Показать всё") params.set("comp", selectedComp);
    if (selectedType) params.set("type", selectedType);
    
    const currentCard = document.getElementById("entity")?.querySelector("h3")?.textContent;
    if (currentCard) params.set("show", currentCard);
    
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newURL);
}

function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    const searchText = params.get("search") || '';
    const tag = params.get("tag") || '';
    const action = params.get("action") || '';
    const find = params.get("find") || '';
    const comp = params.get("comp") || '';
    const type = params.get("type") || '';
    const show = params.get("show") || '';
    
    setTimeout(() => {
        const inpSearch = document.getElementById("inpSearch");
        const inpTags = document.getElementById("inpTags");
        const inpAct = document.getElementById("inpAct");
        const inpFind = document.getElementById("inpFind");
        const inpComp = document.getElementById("inpComp");
        const selPot = document.getElementById("selPot");
        
        if (inpSearch) inpSearch.value = searchText;
        if (inpTags) inpTags.value = tag;
        if (inpAct) inpAct.value = action;
        if (inpFind) inpFind.value = find;
        if (inpComp) inpComp.value = comp;
        if (selPot) selPot.value = type;
        
        doFilter();
        
        if (show) {
            setTimeout(() => showMe(show), 50);
        }
    }, 100);
}

// ==================== ПОИСК СВЯЗАННЫХ КАРТОЧЕК ====================

function findAllByName(name) {
    const key = name.toLowerCase().trim();
    const results = [];
    
    potions.forEach(potion => {
        if (potion.name.toLowerCase() === key) {
            results.push(potion);
            return;
        }
        if (potion.otherNames?.some(n => n.toLowerCase() === key)) {
            results.push(potion);
        }
    });
    
    return results;
}

function makeClickableIfExists(name) {
    const matches = findAllByName(name);
    
    if (matches.length === 0) {
        return name;
    }
    
    if (matches.length === 1) {
        return `<span class="existPot" title="Открыть" onclick="event.stopPropagation(); showMe('${matches[0].name.toLowerCase()}')">${name}</span>`;
    }
    
    const links = matches.map(m => {
        const latin = m.latin ? ` (${m.latin})` : '';
        return `<span class="existPot" title="Открыть" onclick="event.stopPropagation(); showMe('${m.name.toLowerCase()}')">${m.name}${latin}</span>`;
    }).join('<br>');
    
    return `<span class="ambiguousPot" title="Несколько совпадений" 
                onclick="event.stopPropagation();">
        ${name}
        <span class="ambiguousTooltip">${links}</span>
    </span>`;
}

// ==================== ОТОБРАЖЕНИЕ КАРТОЧКИ ====================

function showMe(potName) {
    const potion = potionsByName.get(potName.toLowerCase());
    if (!potion) return;
    
    let card = TEMPLATE_CARD
        .replace("{{NAME}}", potion.name)
        .replace("{{LATIN}}", formatLatin(potion))
        .replace("{{OTHER_NAMES}}", formatOtherNames(potion))
        .replace("{{RARE}}", formatRare(potion))
        .replace("{{FORM}}", potion.form || "")
        .replace("{{DESCRIPTION}}", potion.description || "")
        .replace("{{PARTS}}", formatParts(potion))
        .replace("{{FIND}}", formatFind(potion))
        .replace("{{COMPOSITION}}", formatComposition(potion))
        .replace("{{DIFFICULTY}}", formatDifficulty(potion))
        .replace("{{ACTIONS}}", formatActions(potion))
        .replace("{{NEEDED}}", formatNeeded(potion))
        .replace("{{RECIPE}}", formatRecipe(potion))
        .replace("{{TAGS}}", formatTags(potion))
        .replace("{{INCLUDES_LIST}}", formatIncludedIn(potion));
    
    document.getElementById("entity").innerHTML = card;
    updateURL();
}

function formatLatin(potion) {
    if (!potion.latin) return "";
    return `<div class="latinName">${potion.latin}</div>`;
}

function formatOtherNames(potion) {
    if (!potion.otherNames?.length) return "";
    return `<p>Также: <i>${potion.otherNames.join(', ')}</i></p>`;
}

function formatRare(potion) {
    if (!potion.rare || potion.rare == 0) return "";
    const text = RARE_TEXTS[potion.rare] || "Не определено";
    const rare = potion.rare ?? 0;
    return `<p><b>Встречаемость:</b> <span class="material-symbols-outlined" title="${text}">counter_${rare}</span> <i>${text}</i></p>`;
}

function formatParts(potion) {
    if (!potion.parts?.length) return "Не указаны";
    return potion.parts.join(', ');
}

function formatFind(potion) {
    if (!potion.find?.length) return "";
    const locations = potion.find.map(f => FIND_TEXTS[f] || f).join(', ');
    return `<p><b>Места произрастания:</b> <i>${locations}</i></p>`;
}

function formatComposition(potion) {
    if (!potion.composition?.length) return "Не указан";
    return potion.composition.join(', ');
}

function formatDifficulty(potion) {
    if (!potion.difficulty || potion.difficulty == 0) return "";
    const text = DIFFICULTY_TEXTS[potion.difficulty] || "Не определено.";
    const diff = potion.difficulty ?? 0;
    return `<p><b>Сложность:</b> <span class="material-symbols-outlined" title="${text}">counter_${diff}</span> <i>${text}</i></p>`;
}

function formatActions(potion) {
    if (!potion.actions?.length) return "Не указаны";
    return potion.actions.join(', ');
}

function formatNeeded(potion) {
    if (!potion.neededList?.length) return "—";
    const items = potion.neededList.map(makeClickableIfExists);
    return items.join(', ');
}

function formatRecipe(potion) {
    return potion.recipe ? `<h4>Изготовление:</h4><div>${potion.recipe}</div>` : "";
}

function formatTags(potion) {
    if (!potion.tags?.length) return "";
    return `<h4>Метки:</h4><p><i>${potion.tags.join(', ')}</i></p>`;
}

function formatIncludedIn(potion) {
    const key = potion.name.toLowerCase();
    const usedIn = ingredientToPotions[key];
    if (!usedIn?.length) return "";
    
    const links = usedIn.map(makeClickableIfExists);
    return `<h4>Применяется в:</h4><p><i>${links.join(', ')}</i></p>`;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function updateStatus(shown, hidden, total) {
    document.getElementById("status").innerHTML = 
        `Показано: ${shown};<br>скрыто: ${hidden};<br>всего: ${total}`;
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

window.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadPotions();
});
