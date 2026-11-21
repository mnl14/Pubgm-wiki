const CSV_PATH = "data/dano_base.csv";

const weaponSearch = document.getElementById("weapon-search");
const distanceFilter = document.getElementById("distance-filter");
const weaponList = document.getElementById("weapon-list");
const weaponDetail = document.getElementById("weapon-detail");
const resultsCount = document.getElementById("results-count");
const dataStatus = document.getElementById("data-status");

let database = [];
let selectedWeapon = null;

// Convierte el contenido CSV en una matriz,
// respetando los campos delimitados por comillas.
function parseCSV(text) {
    text = text.replace(/^\uFEFF/, "");

    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            field += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(field.trim());
            field = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (char === "\r" && next === "\n") i++;

            row.push(field.trim());

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    row.push(field.trim());

    if (row.some(value => value !== "")) {
        rows.push(row);
    }

    return rows;
}

// Carga la base de datos.
async function loadDatabase() {
    try {
        const response = await fetch(CSV_PATH);

        if (!response.ok) {
            throw new Error("No se pudo acceder al CSV.");
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        if (rows.length < 2) {
            throw new Error("El CSV no contiene datos.");
        }

        const headers = rows[0];

        const requiredHeaders = [
            "Arma",
            "Distancia (m)",
            "Cabeza",
            "Pecho",
            "Brazos-Piernas",
            "Pies"
        ];

        for (const header of requiredHeaders) {
            if (!headers.includes(header)) {
                throw new Error(`Falta la columna: ${header}`);
            }
        }

        const indexes = {
            weapon: headers.indexOf("Arma"),
            distance: headers.indexOf("Distancia (m)"),
            head: headers.indexOf("Cabeza"),
            chest: headers.indexOf("Pecho"),
            limbs: headers.indexOf("Brazos-Piernas"),
            feet: headers.indexOf("Pies")
        };

        database = rows.slice(1)
            .map(row => ({
                weapon: row[indexes.weapon],
                distance: Number(row[indexes.distance]),
                head: Number(row[indexes.head]),
                chest: Number(row[indexes.chest]),
                limbs: Number(row[indexes.limbs]),
                feet: Number(row[indexes.feet])
            }))
            .filter(item =>
                item.weapon &&
                Number.isFinite(item.distance) &&
                Number.isFinite(item.head) &&
                Number.isFinite(item.chest) &&
                Number.isFinite(item.limbs) &&
                Number.isFinite(item.feet)
            );

        if (database.length === 0) {
            throw new Error("No se encontraron registros válidos.");
        }

        populateDistances();
        renderWeaponList();

        dataStatus.textContent = "Base de datos cargada";
        dataStatus.classList.remove("error");

    } catch (error) {
        console.error(error);

        dataStatus.textContent = "Error al cargar los datos";
        dataStatus.classList.add("error");

        weaponList.innerHTML = `
            <p class="empty-message">
                No se pudo cargar la lista de armas.
            </p>
        `;
    }
}

// Construye las opciones de distancia.
function populateDistances() {
    const distances = [...new Set(
        database.map(item => item.distance)
    )].sort((a, b) => a - b);

    distanceFilter.innerHTML = "";

    distances.forEach(distance => {
        const option = document.createElement("option");
        option.value = distance;
        option.textContent = `${distance} m`;
        distanceFilter.appendChild(option);
    });

    // 0 metros será la distancia inicial.
    if (distances.includes(0)) {
        distanceFilter.value = "0";
    } else if (distances.length > 0) {
        distanceFilter.value = String(distances[0]);
    }
}

// Devuelve las armas disponibles.
function getWeapons() {
    const search = weaponSearch.value.trim().toLowerCase();

    return [...new Set(database.map(item => item.weapon))]
        .filter(weapon => weapon.toLowerCase().includes(search))
        .sort((a, b) => a.localeCompare(b));
}

// Genera la lista de armas.
function renderWeaponList() {
    const weapons = getWeapons();

    resultsCount.textContent = weapons.length;
    weaponList.innerHTML = "";

    if (weapons.length === 0) {
        weaponList.innerHTML = `
            <p class="empty-message">
                No se encontraron armas.
            </p>
        `;

        selectedWeapon = null;
        showEmptyDetail();
        return;
    }

    // Si el arma seleccionada ya no coincide con la búsqueda,
    // se limpia la selección.
    if (selectedWeapon && !weapons.includes(selectedWeapon)) {
        selectedWeapon = null;
        showEmptyDetail();
    }

    weapons.forEach(weapon => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "weapon-option";

        if (weapon === selectedWeapon) {
            button.classList.add("active");
        }

        button.innerHTML = `
            <span>${escapeHTML(weapon)}</span>
            <span class="option-arrow">›</span>
        `;

        button.addEventListener("click", () => {
            selectedWeapon = weapon;
            renderWeaponList();
            renderWeaponDetail();
        });

        weaponList.appendChild(button);
    });
}

// Evita interpretar nombres del CSV como HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// Muestra el estado inicial.
function showEmptyDetail() {
    weaponDetail.innerHTML = `
        <div class="empty-detail">
            <div class="empty-icon">⌖</div>
            <h3>Seleccioná un arma</h3>
            <p>
                Elegí un arma de la lista para consultar
                su daño por zona de impacto.
            </p>
        </div>
    `;
}

// Busca el registro correspondiente al arma y distancia.
function getWeaponData() {
    const distance = Number(distanceFilter.value);

    return database.find(item =>
        item.weapon === selectedWeapon &&
        item.distance === distance
    );
}

// Dibuja la figura humana y sus valores.
function renderBodyDiagram(data) {
    return `
        <div class="body-visual">
            <svg viewBox="0 0 320 510"
                 role="img"
                 aria-label="Figura humana con valores de daño por zona">

                <!-- Silueta base -->
                <circle class="body-base" cx="160" cy="48" r="31"/>

                <path class="body-base"
                    d="M145 80 L175 80 L180 105
                       L140 105 Z"/>

                <path class="body-base"
                    d="M112 105
                       Q160 88 208 105
                       L222 230
                       L98 230 Z"/>

                <path class="body-base"
                    d="M112 110 L82 120 L47 260
                       L66 268 L116 155 Z"/>

                <path class="body-base"
                    d="M208 110 L238 120 L273 260
                       L254 268 L204 155 Z"/>

                <path class="body-base"
                    d="M110 225 L210 225
                       L194 365 L166 365
                       L160 255 L154 365
                       L126 365 Z"/>

                <path class="body-base"
                    d="M126 355 L154 355
                       L143 455 L112 455 Z"/>

                <path class="body-base"
                    d="M166 355 L194 355
                       L208 455 L177 455 Z"/>

                <path class="body-base"
                    d="M112 445 L143 445
                       L143 470 L95 470
                       Q88 460 112 445 Z"/>

                <path class="body-base"
                    d="M177 445 L208 445
                       L225 470 L177 470 Z"/>

                <!-- Zonas de impacto -->
                <circle class="body-zone"
                    cx="160" cy="48" r="29"/>

                <path class="body-zone chest"
                    d="M115 111
                       Q160 96 205 111
                       L215 220
                       L105 220 Z"/>

                <path class="body-zone limbs"
                    d="M110 115 L82 126 L52 257
                       L66 263 L116 155 Z
                       M210 115 L238 126 L268 257
                       L254 263 L204 155 Z
                       M112 230 L208 230
                       L192 355 L166 355
                       L160 260 L154 355
                       L128 355 Z"/>

                <path class="body-zone feet"
                    d="M112 445 L143 445
                       L143 470 L95 470
                       Q88 460 112 445 Z
                       M177 445 L208 445
                       L225 470 L177 470 Z"/>

                <!-- Valores sobre la figura -->
                <text x="160" y="49">${data.head}</text>
                <text x="160" y="165">${data.chest}</text>
                <text x="160" y="295">${data.limbs}</text>
                <text x="160" y="465">${data.feet}</text>
            </svg>
        </div>
    `;
}

// Genera la ficha del arma.
function renderWeaponDetail() {
    if (!selectedWeapon) {
        showEmptyDetail();
        return;
    }

    const data = getWeaponData();
    const distance = Number(distanceFilter.value);

    if (!data) {
        weaponDetail.innerHTML = `
            <div class="empty-detail">
                <h3>${escapeHTML(selectedWeapon)}</h3>
                <p>
                    No hay datos disponibles para esta distancia.
                </p>
            </div>
        `;
        return;
    }

    weaponDetail.innerHTML = `
        <div class="detail-header">
            <div>
                <p class="eyebrow">ANÁLISIS DE DAÑO</p>
                <h3>${escapeHTML(data.weapon)}</h3>
            </div>
            <span class="detail-distance">${distance} m</span>
        </div>

        <div class="damage-content">
            ${renderBodyDiagram(data)}

            <div class="damage-values">
                <div class="damage-value">
                    <span class="zone-name">Cabeza</span>
                    <strong>${data.head}</strong>
                </div>

                <div class="damage-value">
                    <span class="zone-name">Pecho</span>
                    <strong>${data.chest}</strong>
                </div>

                <div class="damage-value">
                    <span class="zone-name">Brazos y piernas</span>
                    <strong>${data.limbs}</strong>
                </div>

                <div class="damage-value">
                    <span class="zone-name">Pies</span>
                    <strong>${data.feet}</strong>
                </div>
            </div>
        </div>

        <p class="damage-note">
            Valores de daño registrados para la distancia seleccionada.
        </p>
    `;
}

// Eventos de interacción.
weaponSearch.addEventListener("input", renderWeaponList);

distanceFilter.addEventListener("change", () => {
    renderWeaponDetail();
});

// Inicio.
document.addEventListener("DOMContentLoaded", loadDatabase);
   
