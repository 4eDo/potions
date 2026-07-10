// ==================== КОНФИГУРАЦИЯ И ШАБЛОНЫ ====================

var potionsSrc = "https://4edo.github.io/potions/data.json";

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

const FILTER_CONFIG = [
    { param: "search", inputId: "inpSearch", isSearch: true },
    { param: "tag",     inputId: "inpTags" },
    { param: "action",  inputId: "inpAct" },
    { param: "find",    inputId: "inpFind", transform: v => FIND_TEXTS[v] },
    { param: "comp",    inputId: "inpComp" },
    { param: "type",    inputId: null, isSelect: true, selector: "selPot" }
];

const TEMPLATE_CARD = `<div>
	<h3>{{NAME}}</h3>
	{{LATIN}}
	{{OTHER_NAMES}}
	{{RARE_BLOCK}}
	{{DIFFICULTY_BLOCK}}
	<h4>Вид:</h4>
	<p>{{FORM}}</p>
	<h4>Описание:</h4>
	<p>{{DESCRIPTION}}</p>
	{{PARTS_BLOCK}}
	{{FIND_BLOCK}}
	{{COMPOSITION_BLOCK}}
	<h4>Действие:</h4>
	<p>{{ACTIONS}}</p>
	{{NEEDED_BLOCK}}
	{{RECIPE}}
	{{TAGS}}
	{{INCLUDES_LIST}}
</div>`;

// ==================== ГЛОБАЛЬНЫЕ ДАННЫЕ И ИНДЕКСЫ ====================

var potions = [];
var potionsByName = new Map();
var allTags = [];
var allActions = [];
var allComposition = [];

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
    const sets = {
        tags: new Set(),
        actions: new Set(),
        composition: new Set()
    };
    
    potions.forEach(potion => {
        potionsByName.set(potion.name.toLowerCase(), potion);
        potion.otherNames?.forEach(alias => 
            potionsByName.set(alias.toLowerCase(), potion)
        );
        
        potion.tags?.forEach(t => sets.tags.add(t));
        potion.actions?.forEach(a => sets.actions.add(a));
        potion.composition?.forEach(c => sets.composition.add(c));
    });
    
    allTags = [...sets.tags].sort();
    allActions = [...sets.actions].sort();
    allComposition = [...sets.composition].sort();
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

function getCounterMarker(value, dictionary, cssClass) {
    const num = value ?? 0;
    if (num == 0) return '';
    const text = dictionary[num] || 'Не определено';
    return `<span class="material-symbols-outlined ${cssClass}" title="${text}">counter_${num}</span>`;
}

// ==================== РЕНДЕРИНГ ЭЛЕМЕНТА СПИСКА ====================

function renderListItem(potion, visible) {
    const markers = getMarkers(potion);
    const rareMarker = getCounterMarker(potion.rare, RARE_TEXTS, 'rareMarker');
    const diffMarker = getCounterMarker(potion.difficulty, DIFFICULTY_TEXTS, 'diffMarker');
    
    return `<li style="${visible ? '' : 'display: none;'}" data-name="${potion.name}" 
                onclick="showMe('${potion.name}')">
        <span class="canonMarkers">${markers}</span>
        <span class="itemName">${potion.name}</span>
        <span class="rightMarkers">${rareMarker}${diffMarker}</span>
    </li>`;
}

// ==================== РЕНДЕРИНГ САЙДБАРА ====================

function renderSidebar(potionsList) {
    const sidebar = potionsList.map(p => renderListItem(p, true)).join('');
    document.getElementById("relList").innerHTML = sidebar;
}

// ==================== РЕНДЕРИНГ ФИЛЬТРОВ ====================

function renderFilters() {
    createFilter("actCell", "inpAct", "datalistAct", allActions);
    createFilter("tagsCell", "inpTags", "datalistTags", allTags);
    createFilter("findCell", "inpFind", "datalistFind", Object.keys(FIND_TEXTS), v => FIND_TEXTS[v]);
    createFilter("compCell", "inpComp", "datalistComp", allComposition);
    
    const selPot = document.getElementById("selPot");
    if (selPot) {
        selPot.addEventListener('change', doFilter);
    }
}

function createFilter(containerId, inputId, datalistId, options, transformFn) {
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
    const optionValues = options.map(opt => transformFn ? transformFn(opt) : opt);
    datalist.innerHTML = '<option value="Показать всё" />' + 
        optionValues.map(v => `<option value="${v}" />`).join('');
    
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
        
        if (visible) shown++; else hidden++;
        
        return renderListItem(potion, visible);
    }).join('');
    
    document.getElementById("relList").innerHTML = listItems;
    updateStatus(shown, hidden, potions.length);
    updateURL();
}

// ==================== ОЧИСТКА ФИЛЬТРОВ ====================

function clearFilters() {
    // Очищаем все текстовые поля
    document.getElementById("inpSearch").value = '';
    document.getElementById("inpTags").value = '';
    document.getElementById("inpAct").value = '';
    document.getElementById("inpFind").value = '';
    document.getElementById("inpComp").value = '';
    
    // Сбрасываем селект типа
    document.getElementById("selPot").value = 'all';
    
    // Применяем фильтр
    doFilter();
}

// ==================== URL-ПАРАМЕТРЫ ====================

function updateURL() {
    const params = new URLSearchParams();
    
    FILTER_CONFIG.forEach(({ param, inputId, isSearch, isSelect, selector }) => {
        let value;
        if (isSelect) {
            value = document.getElementById(selector)?.value || '';
        } else if (inputId) {
            value = document.getElementById(inputId)?.value || '';
        }
        if (value && value !== "Показать всё") params.set(param, value);
        if (isSearch && value) params.set(param, value);
    });
    
    const currentCard = document.getElementById("entity")?.querySelector("h3")?.textContent;
    if (currentCard) params.set("show", currentCard);
    
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newURL);
}

function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show") || '';
    
    setTimeout(() => {
        FILTER_CONFIG.forEach(({ param, inputId, isSelect, selector }) => {
            const value = params.get(param) || '';
            let element;
            if (isSelect) {
                element = document.getElementById(selector);
            } else if (inputId) {
                element = document.getElementById(inputId);
            }
            if (element && value) element.value = value;
        });
        
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

// ==================== ФОРМАТИРОВАНИЕ БЛОКОВ КАРТОЧКИ ====================

function formatBlock(label, value) {
    if (!value) return "";
    return `<h4>${label}:</h4><p>${value}</p>`;
}

function formatCounterBlock(label, value, dictionary) {
    if (!value || value == 0) return "";
    const text = dictionary[value] || "Не определено";
    const icon = `<span class="material-symbols-outlined" title="${text}">counter_${value}</span>`;
    return `<p><b>${label}:</b> ${icon} <i>${text}</i></p>`;
}

// ==================== ОТОБРАЖЕНИЕ КАРТОЧКИ ====================

function showMe(potName) {
    const potion = potionsByName.get(potName.toLowerCase());
    if (!potion) return;
    
    let card = TEMPLATE_CARD
        .replace("{{NAME}}", potion.name)
        .replace("{{LATIN}}", potion.latin ? `<div class="latinName">${potion.latin}</div>` : "")
        .replace("{{OTHER_NAMES}}", potion.otherNames?.length ? `<p>Также: <i>${potion.otherNames.join(', ')}</i></p>` : "")
        .replace("{{RARE_BLOCK}}", formatCounterBlock("Встречаемость", potion.rare, RARE_TEXTS))
        .replace("{{FORM}}", potion.form || "")
        .replace("{{DESCRIPTION}}", potion.description || "")
        .replace("{{PARTS_BLOCK}}", formatBlock("Используемые части", potion.parts?.join(', ')))
        .replace("{{FIND_BLOCK}}", potion.find?.length ? `<p><b>Места произрастания:</b> <i>${potion.find.map(f => FIND_TEXTS[f] || f).join(', ')}</i></p>` : "")
        .replace("{{COMPOSITION_BLOCK}}", formatBlock("Химический состав", potion.composition?.join(', ')))
        .replace("{{DIFFICULTY_BLOCK}}", formatCounterBlock("Сложность", potion.difficulty, DIFFICULTY_TEXTS))
        .replace("{{ACTIONS}}", potion.actions?.length ? potion.actions.join(', ') : "Не указаны")
        .replace("{{NEEDED_BLOCK}}", potion.neededList?.length ? `<h4>Состав:</h4><p>${potion.neededList.map(makeClickableIfExists).join(', ')}</p>` : "")
        .replace("{{RECIPE}}", potion.recipe ? `<h4>Изготовление:</h4><div>${potion.recipe}</div>` : "")
        .replace("{{TAGS}}", potion.tags?.length ? `<h4>Метки:</h4><p><i>${potion.tags.join(', ')}</i></p>` : "")
        .replace("{{INCLUDES_LIST}}", formatIncludedIn(potion));
    
    document.getElementById("entity").innerHTML = card;
    updateURL();
}

function formatIncludedIn(potion) {
    const results = [];
    
    potions.forEach(otherPotion => {
        if (!otherPotion.neededList?.length) return;
        
        otherPotion.neededList.forEach(ingredient => {
            const matches = findAllByName(ingredient);
            
            if (matches.some(m => m.name === potion.name)) {
                if (!results.includes(otherPotion.name)) {
                    results.push(otherPotion.name);
                }
            }
        });
    });
    
    if (!results.length) return "";
    
    const links = results.map(name => makeClickableIfExists(name));
    return `<h4>Применяется в:</h4><p><i>${links.join(', ')}</i></p>`;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function updateStatus(shown, hidden, total) {
    document.getElementById("status").innerHTML = 
        `Показано: ${shown};<br>скрыто: ${hidden};<br>всего: ${total}`;
}

// ==================== СПОЙЛЕР ФИЛЬТРОВ ====================

function toggleFilters() {
    const panel = document.getElementById('filtersPanel');
    const btn = document.getElementById('toggleFiltersBtn');
    const isHidden = panel.classList.toggle('hidden');
    
    if (!isHidden) {
        btn.classList.add('active');
        localStorage.setItem('filtersOpen', 'true');
    } else {
        btn.classList.remove('active');
        localStorage.setItem('filtersOpen', 'false');
    }
}

function loadFiltersState() {
    const isOpen = localStorage.getItem('filtersOpen') === 'true';
    const panel = document.getElementById('filtersPanel');
    const btn = document.getElementById('toggleFiltersBtn');
    
    if (isOpen) {
        panel.classList.remove('hidden');
        btn.classList.add('active');
    }
}

// ==================== ТЕМА (обновлённая) ====================

function toggleTheme() {
    document.body.classList.toggle('night');
    const icon = document.querySelector('#themeToggleBtn .material-symbols-outlined');
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
    const icon = document.querySelector('#themeToggleBtn .material-symbols-outlined');
    if (saved === 'night') {
        document.body.classList.add('night');
        if (icon) icon.textContent = 'light_mode';
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

window.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadFiltersState();
    loadPotions();
});
