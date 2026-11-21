
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
        distance: document.getElementById(`distance-filter-${id}`),
        helmet: document.getElementById(`helmet-filter-${id}`),
        vest: document.getElementById(`vest-filter-${id}`),
        list: document.getElementById(`weapon-list-${id}`),
        detail: document.getElementById(`weapon-detail-${id}`),
        count: document.getElementById(`results-count-${id}`)
    };
}

function populateDistances(panel) {
    const distances = [...new Set(
        database.map(item => item.distance)
    )].sort((a, b) => a - b);

    panel.distance.innerHTML = "";

    distances.forEach(distance => {
        const option = document.createElement("option");
        option.value = distance;
        option.textContent = `${distance} m`;
        panel.distance.appendChild(option);
    });

    panel.distance.value = distances.includes(0)
        ? "0"
        : String(distances[0]);
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
    const distance = Number(panel.distance.value);

    return database.find(item =>
        item.weapon === panel.selectedWeapon &&
        item.distance === distance
    );
}

function showEmptyDetail(panel, title = "Seleccioná un arma") {
    panel.detail.innerHTML = `
        <div class="empty-detail">
            <h3>${escapeHTML(title)}</h3>
            <p>Elegí un arma de la lista para consultar su daño.</p>
        </div>
    `;
}

function applyProtection(damage, reduction) {
    return damage * (1 - reduction);
}

function formatDamage(value) {
    return Math.round(value).toString();
}

function getProtectedDamage(data, panel) {
    const helmetReduction = Number(panel.helmet.value);
    const vestReduction = Number(panel.vest.value);

    return {
        head: applyProtection(data.head, helmetReduction),
        chest: applyProtection(data.chest, vestReduction),
        limbs: data.limbs,
        feet: data.feet
    };
}

function renderBodyDiagram(data) {
    return `
        <div class="body-visual">
            <svg viewBox="0 0 320 510"
                 role="img"
                 aria-label="Figura humana con valores de daño por zona">

                <circle class="body-base" cx="160" cy="48" r="31"/>

                <path class="body-base"
                    d="M145 80 L175 80 L180 105 L140 105 Z"/>

                <path class="body-base"
                    d="M112 105 Q160 88 208 105
                       L222 230 L98 230 Z"/>

                <path class="body-base"
                    d="M112 110 L82 120 L47 260
                       L66 268 L116 155 Z"/>

                <path class="body-base"
                    d="M208 110 L238 120 L273 260
                       L254 268 L204 155 Z"/>

                <path class="body-base"
                    d="M110 225 L210 225 L194 365
                       L166 365 L160 255 L154 365 L126 365 Z"/>

                <path class="body-base"
                    d="M126 355 L154 355 L143 455 L112 455 Z"/>

                <path class="body-base"
                    d="M166 355 L194 355 L208 455 L177 455 Z"/>

                <path class="body-base"
                    d="M112 445 L143 445 L143 470
                       L95 470 Q88 460 112 445 Z"/>

                <path class="body-base"
                    d="M177 445 L208 445 L225 470 L177 470 Z"/>

                <circle class="body-zone" cx="160" cy="48" r="29"/>

                <path class="body-zone chest"
                    d="M115 111 Q160 96 205 111
                       L215 220 L105 220 Z"/>

                <path class="body-zone limbs"
                    d="M110 115 L82 126 L52 257
                       L66 263 L116 155 Z
                       M210 115 L238 126 L268 257
                       L254 263 L204 155 Z
                       M112 230 L208 230 L192 355
                       L166 355 L160 260 L154 355 L128 355 Z"/>

                <path class="body-zone feet"
                    d="M112 445 L143 445 L143 470
                       L95 470 Q88 460 112 445 Z
                       M177 445 L208 445 L225 470 L177 470 Z"/>

                <text x="160" y="49">${formatDamage(data.head)}</text>
                <text x="160" y="165">${formatDamage(data.chest)}</text>
                <text x="160" y="295">${formatDamage(data.limbs)}</text>
                <text x="160" y="465">${formatDamage(data.feet)}</text>
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
    const distance = Number(panel.distance.value);

    if (!data) {
        showEmptyDetail(
            panel,
            `${panel.selectedWeapon} — sin datos a ${distance} m`
        );
        return;
    }

    const damage = getProtectedDamage(data, panel);

    panel.detail.innerHTML = `
        <div class="detail-header">
            <div>
                <p class="eyebrow">DAÑO POR ZONA</p>
                <h3>${escapeHTML(data.weapon)}</h3>
            </div>
            <span class="detail-distance">${distance} m</span>
        </div>

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

        <p class="damage-note">
            Daño recibido según la distancia y protección seleccionadas.
        </p>
    `;
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

            panel.distance.addEventListener("change", () => {
                renderWeaponDetail(panel);
            });

            panel.helmet.addEventListener("change", () => {
                renderWeaponDetail(panel);
            });

            panel.vest.addEventListener("change", () => {
                renderWeaponDetail(panel);
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

        
