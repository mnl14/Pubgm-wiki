
const CSV_PATH = "data/dano_base.csv";

const database = [];
const panels = [];

const IMAGE_PATH = "assets/img/";

// Arma del CSV -> archivo de imagen.
// Si falta una arma, no tiene imagen todavía.
const WEAPON_IMAGES = {
    "ACE32": "Item_Weapon_ACE32_C_h.png",
    "AKM": "Item_Weapon_AK47_C_h.png",
    "AUG": "Item_Weapon_AUG_C_h.png",
    "AWM": "Item_Weapon_AWM_C_h.png",
    "DP-28": "Item_Weapon_DP28_C_h.png",
    "DSR": "Item_Weapon_L6_C_h.png",
    "Groza": "Item_Weapon_GROZA_C_h.png",
    "Kar98K": "Item_Weapon_Kar98k_C_h.png",
    "M1 Garand": "Item_Weapon_Mosin_C_h.png",
    "M16A4": "Item_Weapon_M16A4_C_h.png",
    "M24": "Item_Weapon_M24_C_h.png",
    "M249": "Item_Weapon_M249_C_h.png",
    "M416": "Item_Weapon_HK416_C_h.png",
    "M762": "Item_Weapon_BerylM762_C_h.png",
    "MG3": "Item_Weapon_MG3_C_h.png",
    "Mini14": "Item_Weapon_Mini14_C_h.png",
    "Mk12": "Item_Weapon_Mk12_C_h.png",
    "P90": "Item_Weapon_P90_C_h.png",
    "PP-19 Bizon": "Item_Weapon_BizonPP19_C_h.png",
    "SCAR-L": "Item_Weapon_SCAR-L_C_h.png",
    "SKS": "Item_Weapon_SKS_C_h.png",
    "SLR": "Item_Weapon_FNFAL_C_h.png",
    "UMP": "Item_Weapon_UMP_C_h.png",
    "UZI": "Item_Weapon_UZI_C_h.png",
    "Vector": "Item_Weapon_Vector_C_h.png"
};

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

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function initializePanels() {
    panels.push(createPanel(1, "M416"));
    panels.push(createPanel(2, "AUG"));
}

function createPanel(id, defaultWeapon) {
    return {
        id,
        selectedWeapon: defaultWeapon,
        search: document.getElementById(`weapon-search-${id}`),
        distance: 0,
        distances: [],
        helmet: 0,
        vest: 0,
        list: document.getElementById(`weapon-list-${id}`),
        detail: document.getElementById(`weapon-detail-${id}`),
        count: document.getElementById(`results-count-${id}`)
    };
}

function populateDistances(panel) {
    panel.distances = [...new Set(
        database.map(item => item.distance)
    )].sort((a, b) => a - b);

    panel.distance = panel.distances.includes(0)
        ? 0
        : panel.distances[0];
}

function getWeapons(panel) {
    const search = panel.search.value.trim().toLowerCase();

    return [...new Set(database.map(item => item.weapon))]
        .filter(weapon => weapon.toLowerCase().includes(search))
        .sort((a, b) => a.localeCompare(b));
}

function renderWeaponList(panel) {
    const weapons = getWeapons(panel);

    panel.count.textContent = weapons.length;
    panel.list.innerHTML = "";

    if (panel.selectedWeapon && !weapons.includes(panel.selectedWeapon)) {
        panel.selectedWeapon = null;
    }

    if (weapons.length === 0) {
        panel.list.innerHTML = `
            <p class="empty-message">No se encontraron armas.</p>
        `;

        renderWeaponDetail(panel);
        return;
    }

    weapons.forEach(weapon => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "weapon-option";
        button.textContent = weapon;

        if (weapon === panel.selectedWeapon) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            panel.selectedWeapon = weapon;
            renderWeaponList(panel);
            renderWeaponDetail(panel);
        });

        panel.list.appendChild(button);
    });

    if (!panel.selectedWeapon) {
        renderWeaponDetail(panel);
    }
}

function getWeaponData(panel) {
    const distance = panel.distance;

    return database.find(item =>
        item.weapon === panel.selectedWeapon &&
        item.distance === distance
    );
}

function showEmptyDetail(panel, title = "Seleccioná un arma") {
    panel.detail.innerHTML = `
        ${renderDetailHeader(panel, panel.selectedWeapon || "—")}

        <div class="empty-detail">
            <h3>${escapeHTML(title)}</h3>
            <p>Elegí un arma de la lista para consultar su daño.</p>
        </div>
    `;

    bindDetailControls(panel);
}

function renderDetailHeader(panel, title) {
    const buttons = panel.distances.map(distance => `
        <button type="button"
                class="segment${distance === panel.distance ? " active" : ""}"
                data-distance="${distance}">${distance}</button>
    `).join("");

    return `
        <div class="detail-header">
            <div class="distance-control">
                <p class="eyebrow">DISTANCIA (m)</p>
                <div class="segmented" role="group" aria-label="Distancia">
                    ${buttons}
                </div>
            </div>

            <div class="weapon-title">
                <p class="eyebrow">DAÑO POR ZONA</p>
                <h3>${escapeHTML(title)}</h3>
            </div>
        </div>
    `;
}

const PROTECTION_LEVELS = [
    { value: 0, label: "Sin", title: "Sin protección" },
    { value: 0.30, label: "Nv 1", title: "Nivel 1 (−30 %)" },
    { value: 0.40, label: "Nv 2", title: "Nivel 2 (−40 %)" },
    { value: 0.55, label: "Nv 3", title: "Nivel 3 (−55 %)" }
];

function renderEquipmentGroup(panel, key, label) {
    const buttons = PROTECTION_LEVELS.map(level => `
        <button type="button"
                class="segment${level.value === panel[key] ? " active" : ""}"
                title="${level.title}"
                data-equip="${key}"
                data-value="${level.value}">${level.label}</button>
    `).join("");

    return `
        <div class="equipment-group">
            <span class="equipment-label">${label}</span>
            <div class="segmented">${buttons}</div>
        </div>
    `;
}

function bindDetailControls(panel) {
    panel.detail.querySelectorAll("[data-distance]").forEach(button => {
        button.addEventListener("click", () => {
            panel.distance = Number(button.dataset.distance);
            renderWeaponDetail(panel);
        });
    });

    panel.detail.querySelectorAll("[data-equip]").forEach(button => {
        button.addEventListener("click", () => {
            panel[button.dataset.equip] = Number(button.dataset.value);
            renderWeaponDetail(panel);
        });
    });
}

function applyProtection(damage, reduction) {
    return damage * (1 - reduction);
}

function formatDamage(value) {
    return Math.round(value).toString();
}

function getProtectedDamage(data, panel) {
    const helmetReduction = panel.helmet;
    const vestReduction = panel.vest;

    return {
        head: applyProtection(data.head, helmetReduction),
        chest: applyProtection(data.chest, vestReduction),
        limbs: data.limbs,
        feet: data.feet
    };
}

// Figura humana (proporción de 8 cabezas).
// Cada pieza se dibuja en el lado izquierdo
// y se refleja en el derecho (eje central x = 160).
const BODY_PARTS = {
    neck: "M149 64 L171 64 L173 92 C166 97 154 97 147 92 Z",

    head: "M160 10 C173 10 182 22 182 38 C182 50 178 60 171 67 " +
          "C167 71 164 73 160 73 C156 73 153 71 149 67 " +
          "C142 60 138 50 138 38 C138 22 147 10 160 10 Z",

    chest: "M160 94 C150 94 138 96 128 100 C118 102 112 108 111 120 " +
           "C111 140 114 156 117 172 C119 186 121 196 123 204 L160 204 Z",

    arm: "M130 98 C112 98 98 106 94 124 C91 142 89 160 86 178 " +
         "C84 190 82 200 81 208 C78 226 74 248 71 268 " +
         "C69 280 66 292 66 304 C66 312 70 318 74 318 " +
         "C80 318 83 312 84 304 C85 292 86 282 88 270 " +
         "C92 250 98 228 100 210 C102 198 106 184 109 172 " +
         "C112 160 114 146 115 132 Z",

    lower: "M160 204 L123 204 C121 216 119 228 117 242 " +
           "C115 250 114 258 115 268 C115 300 117 330 120 352 " +
           "C122 362 122 372 121 382 C119 400 118 418 121 436 " +
           "C123 454 126 470 130 484 L146 484 " +
           "C146 468 147 452 149 436 C150 420 150 404 148 390 " +
           "C148 380 147 372 147 362 C150 340 153 310 156 290 " +
           "C158 280 159 272 160 264 Z",

    foot: "M130 480 L146 480 C148 490 150 498 148 503 " +
          "C140 508 124 508 112 506 C106 505 104 500 108 495 " +
          "C116 492 125 488 130 480 Z"
};

function mirrorPart(path, className) {
    return `
        <path class="${className}" d="${path}"/>
        <path class="${className}" d="${path}"
              transform="translate(320 0) scale(-1 1)"/>
    `;
}

function renderBodyDiagram(data) {
    const feet = formatDamage(data.feet);

    return `
        <div class="body-visual">
            <svg viewBox="0 0 320 520"
                 role="img"
                 aria-label="Figura humana con valores de daño por zona">

                <path class="body-base" d="${BODY_PARTS.neck}"/>

                ${mirrorPart(BODY_PARTS.arm, "body-zone limbs")}
                ${mirrorPart(BODY_PARTS.lower, "body-zone limbs")}
                ${mirrorPart(BODY_PARTS.chest, "body-zone chest")}
                <path class="body-zone" d="${BODY_PARTS.head}"/>
                ${mirrorPart(BODY_PARTS.foot, "body-zone feet")}

                <text class="t-head" x="160" y="42">${formatDamage(data.head)}</text>
                <text class="t-main" x="160" y="150">${formatDamage(data.chest)}</text>
                <text class="t-main" x="160" y="244">${formatDamage(data.limbs)}</text>
                <text class="t-feet" x="130" y="494">${feet}</text>
                <text class="t-feet" x="190" y="494">${feet}</text>
            </svg>
        </div>
    `;
}

function renderWeaponImage(weapon) {
    const file = WEAPON_IMAGES[weapon];

    if (!file) {
        return `
            <div class="weapon-image placeholder">
                <span>Imagen no disponible</span>
            </div>
        `;
    }

    return `
        <div class="weapon-image">
            <img src="${IMAGE_PATH}${encodeURIComponent(file)}"
                 alt="${escapeHTML(weapon)}"
                 loading="lazy"
                 onerror="this.parentElement.classList.add('placeholder'); this.replaceWith(Object.assign(document.createElement('span'), {textContent: 'Imagen no disponible'}));">
        </div>
    `;
}

function renderWeaponDetail(panel) {
    if (!panel.selectedWeapon) {
        showEmptyDetail(panel);
        return;
    }

    const data = getWeaponData(panel);
    const distance = panel.distance;

    if (!data) {
        showEmptyDetail(
            panel,
            `${panel.selectedWeapon} — sin datos a ${distance} m`
        );
        return;
    }

    const damage = getProtectedDamage(data, panel);

    panel.detail.innerHTML = `
        ${renderDetailHeader(panel, data.weapon)}

        <div class="damage-content">
            ${renderBodyDiagram(damage)}

            <div class="damage-side">
                ${renderWeaponImage(data.weapon)}

                <div class="damage-values">
                <div class="damage-value">
                    <span class="zone-name">Cabeza</span>
                    <strong>${formatDamage(damage.head)}</strong>
                </div>

                <div class="damage-value">
                    <span class="zone-name">Pecho</span>
                    <strong>${formatDamage(damage.chest)}</strong>
                </div>

                <div class="damage-value">
                    <span class="zone-name">Brazos y piernas</span>
                    <strong>${formatDamage(damage.limbs)}</strong>
                </div>

                <div class="damage-value">
                    <span class="zone-name">Pies</span>
                    <strong>${formatDamage(damage.feet)}</strong>
                </div>
                </div>
            </div>
        </div>

        <div class="equipment-controls">
            ${renderEquipmentGroup(panel, "helmet", "Casco")}
            ${renderEquipmentGroup(panel, "vest", "Chaleco")}
        </div>

        <p class="damage-note">
            Daño recibido según la distancia y protección seleccionadas.
        </p>
    `;

    bindDetailControls(panel);
}

async function loadDatabase() {
    const dataStatus = document.getElementById("data-status");

    try {
        const response = await fetch(CSV_PATH);

        if (!response.ok) {
            throw new Error("No se pudo acceder al CSV.");
        }

        const rows = parseCSV(await response.text());

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

        database.push(...rows.slice(1)
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
            )
        );

        if (database.length === 0) {
            throw new Error("No se encontraron registros válidos.");
        }

        initializePanels();

        panels.forEach(panel => {
            populateDistances(panel);
            renderWeaponList(panel);
            renderWeaponDetail(panel);

            panel.search.addEventListener("input", () => {
                renderWeaponList(panel);
            });
        });

        dataStatus.textContent = "Base de datos cargada";
        dataStatus.classList.remove("error");

    } catch (error) {
        console.error(error);

        dataStatus.textContent = "Error al cargar los datos";
        dataStatus.classList.add("error");

        document.querySelectorAll(".weapon-list").forEach(list => {
            list.innerHTML = `
                <p class="empty-message">
                    No se pudo cargar la lista de armas.
                </p>
            `;
        });
    }
}

document.addEventListener("DOMContentLoaded", loadDatabase);
