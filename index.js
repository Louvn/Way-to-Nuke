// HTML elements
const gameScreen = document.getElementById("gameScreen");
const oreDestroyingProgress = document.getElementById("oreDestroyingProgress");
const inventoryScreen = document.getElementById("inventory");
const shop = document.getElementById("shop");
const shopItemsScreen = document.getElementById("shopItems");
const shopItemCardTemplate = document.getElementById("shopItemCardTemplate");
const npcWindow = document.getElementById("npcWindow");

// variables for easter eggs
let notConfirmedInARow = 0;
let lastOreClick = null;

// Load Saved Game
let savedGame;
async function initGame() {
    if ("everlyAPI" in window) {
        savedGame = await everlyAPI.loadGame();
        startGame();
    } else {
        savedGame = JSON.parse(localStorage.getItem("save"));
        startGame();
    }

    if (!savedGame) {
        savedGame = {
            oreDamageOnClick: 1,
            oreDamageOnTick: 0,
            level: 0, // total of destroyed ores
            inventory: {},
            inventoryHistory: {}, // Supposed to be a copy of inventory but without substracting ores
            shop: [],
            allOres: [],
            currentOre: null,
            efficiency: 1
        }
    }
} 

let allNpcs = null;
let isPressed = false;
let isTalking = false;

initGame();

document.addEventListener("keydown", (e) => {
    if((e.code === "Enter" || e.code === "Space") && !isPressed) {
        isPressed = true;
        e.preventDefault();
        onOreClick();
    }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "Enter" || e.code === "Space") isPressed = false;
})

function typeNext(lines, line, char, resolve) {
    if (char >= lines[line].length) {
        setTimeout(() => {
            if (line >= lines.length - 1) {
                npcWindow.classList.remove("text-shown");
                isTalking = false;
                resolve();
                return
            };

            npcWindow.querySelector("span").textContent = "";
            typeNext(lines, line + 1, 0, resolve);
        }, 1000);
        return
    }
    npcWindow.querySelector("span").textContent += lines[line][char];
    setTimeout(() => typeNext(lines, line, char + 1, resolve), 100)
}

function speak(npc, lines_idx) {
    return new Promise(resolve => {
        if (isTalking === true) return resolve();
        isTalking = true;
        npcWindow.classList.add("text-shown");
        npcWindow.querySelector("span").textContent = "";
        npcWindow.querySelector("img").src = `./assets/${npc}.png`;
        typeNext(allNpcs[npc][lines_idx], 0, 0, resolve);
    })
}

function renderInventory(inv = savedGame.inventory, invScreen = inventoryScreen, id = "inventory") {
    Object.entries(inv).forEach(([ore, value]) => {
        let existing = document.getElementById(`${id}-${ore}`);
        if (!existing) {
            existing = document.createElement("li");
            existing.id = (`${id}-${ore}`);
            existing.innerHTML = `<img src="./assets/${ore.toLowerCase()}_ore.png" alt="${ore}"><span class="inventory-value"></span>`;
            invScreen.appendChild(existing);
        }
        const inventoryValue = existing.querySelector(".inventory-value");
        inventoryValue.innerText = value;
    });
}

function destroyOre(ore_id = savedGame.currentOre) {
    savedGame.level += 1;

    // adding ore to inv
    if (!savedGame.inventory[ore_id]) savedGame.inventory[ore_id] = 0;
    savedGame.inventory[ore_id] += 1;

    // adding ore to inventoryHistory
    if (!savedGame.inventoryHistory[ore_id]) savedGame.inventoryHistory[ore_id] = 0;
    savedGame.inventoryHistory[ore_id] += 1;
    
    if (savedGame.level == 1) speak("general_nuggeta", 1);

    generateNewOre();
    renderInventory();
}

function onOreClick() {
    if (!savedGame.currentOre) return;

    // for easter egg
    lastOreClick = performance.now();

    oreDestroyingProgress.value -= savedGame.oreDamageOnClick;
    if (oreDestroyingProgress.value <= 0) {
        destroyOre();
    }
}

async function generateNewOre(id = null) {
    document.querySelectorAll(".ore-button").forEach(el => el.remove());

    const allOresAvailable = savedGame.allOres.filter(
        (ore) => ore.min_level <= savedGame.level && ore.discovered
    );

    let oreData = allOresAvailable[Math.floor(Math.random() * allOresAvailable.length)];

    if (id) {
        allOresAvailable.forEach((ore) => {
            if (ore.name == id ) {
                oreData = ore;
            }
        })
    }

    const ore = document.createElement("button");
    ore.classList.add("ore-button");
    ore.id = oreData.name;

    const oreImg = document.createElement("img");
    oreImg.src = oreData.image;
    oreImg.alt = oreData.name;

    ore.appendChild(oreImg);

    oreDestroyingProgress.max = oreData.health;
    oreDestroyingProgress.value = oreData.health;

    ore.addEventListener("click", () => onOreClick());
    
    savedGame.currentOre = ore.id;
    gameScreen.appendChild(ore);

    // npc reaction
    // using inventoryHistory to check for example if it was the first Cooper ever generated
    if (oreData.name == "Copper" && !("Copper" in savedGame.inventoryHistory)) speak("general_nuggeta", 3);
    if (oreData.name == "Iron" && !("Iron" in savedGame.inventoryHistory)) speak("general_nuggeta", 7);
    if (oreData.name == "Ruby" && !("Ruby" in savedGame.inventoryHistory)) speak("general_nuggeta", 9);
    if (oreData.name == "Sapphire" && !("Sapphire" in savedGame.inventoryHistory)) speak("marco_de_sandias", 0);
    if (oreData.name == "Gold" && savedGame.inventoryHistory["Gold"] == 1) speak("general_nuggeta", 11);
    if (oreData.name == "Uranium" && (savedGame.inventoryHistory["Uranium"] == 2)) {
        await speak("ava_admiral", 0);
        await speak("general_nuggeta", 12);
        await speak("ava_admiral", 1);
        await speak("general_nuggeta", 13);
        await speak("ava_admiral", 2);
    }
    if (oreData.name == "Uranium" && (savedGame.inventoryHistory["Uranium"] == 10)) {
        await speak("ava_admiral", 3);
        await speak("general_nuggeta", 15);
        await speak("henri", 3);
        await speak("ava_admiral", 4);
        await speak("ava_marine_soldier", 0);

        setTimeout(async () => {
            await speak("marco_de_sandias", 1);
        }, 5 * 1000);
    }
    if (savedGame.inventoryHistory["Uranium"] == 100 && savedGame.inventoryHistory["Titanium"] == 150) {
        speak("the_scientist", 1);
    }
    if (oreData.name == "Uranium" && !("Uranium" in savedGame.inventoryHistory)) speak("general_nuggeta", 16);
}

function openShop() {
    shop.classList.add("open");
}

function closeShop() {
    shop.classList.remove("open");
}

function increaseItemPrice(item) {
    Object.entries(item.priceIncrement).forEach(([k, v]) => {
        savedGame.shop.forEach((itemInSave) => {
            if (item.name == itemInSave.name){
                itemInSave.price[k] += v;
            }
        })
    })
    renderShop();
}

async function buyItem(item) {
    let itemInSave;
    savedGame.shop.forEach((saveItem) => {
        if (saveItem.name == item.name) {
            itemInSave = saveItem;
        }
    })
    const requirementsToBuy = Object.entries(itemInSave.price);

    for (const [ore, number] of requirementsToBuy) {
        let inInventory = false;
        Object.entries(savedGame.inventory).forEach(([inventoryOre, inventoryNumber]) => {
            if (inventoryOre == ore && inventoryNumber >= number) inInventory = true;
        });
        if (!inInventory) {

            if (Math.random() > 0.5) {
                speak("shopkeeper", 0);
            } else {
                speak("shopkeeper", 1);
            }

            return;
        }
    };

    // confirming the action
    if (!confirm("Do you want to buy " + item.name + "?")) {

        // easter egg: special dialogue if you not confirmed often in a row
        notConfirmedInARow += 1;

        if (notConfirmedInARow >= 3) {
            speak("shopkeeper", 2);
        }

        return;
    }
    notConfirmedInARow = 0;

    requirementsToBuy.forEach(([ore, number]) => {
        savedGame.inventory[ore] -= number;
    });

    renderInventory();
    increaseItemPrice(item);

    let effect = item.effect;

    if (effect.click) {
        savedGame.oreDamageOnClick += effect.click;
    }
    if (effect.tick) {
        savedGame.oreDamageOnTick += effect.tick;
    }
    if (effect.discovered) {
        effect.discovered.forEach(ore => {
            const idx = savedGame.allOres.findIndex(oreEntry => oreEntry.name == ore);
            savedGame.allOres[idx].discovered = true;
        });
    }
    if (effect.efficiency) {
        savedGame.efficiency *= effect.efficiency;
    }

    // buyable & buyed
    const idx = savedGame.shop.findIndex((e) => e.name == item.name);
    savedGame.shop[idx].buyed += 1;
    if (savedGame.shop[idx].buyed >= savedGame.shop[idx].buyable) {
        savedGame.shop.splice(idx, 1);
        renderShop();
    }

    // npc reaction
    if (item.name == "Pickaxe" && savedGame.shop.find(e => e.name == "Pickaxe").buyed == 1) {
        await speak("general_nuggeta", 2);
        await speak("henri", 0);
        await speak("general_nuggeta", 4);
        await speak("henri", 1);
        await speak("general_nuggeta", 5);
        await speak("henri", 2);
        await speak("general_nuggeta", 6)
    }
    if (item.name == "Dynamite" && savedGame.shop.find(e => e.name == "Dynamite").buyed == 1) {
        await speak("general_nuggeta", 8)
    }
    if (item.name == "Mineshaft A") speak("general_nuggeta", 10);
    if (item.name == "The Scientist") {
        speak("the_scientist", 0);
    }
    if (item.name == "Nuke") {
        await speak("marco_de_sandias", 2);
        await speak("the_scientist", 2);
    }
}

function renderShop() {
    shopItemsScreen.innerHTML = "";
    savedGame.shop.forEach(shopItem => {
        const shopItemCard = shopItemCardTemplate.content.cloneNode(true);
        shopItemCard.querySelector(".image").src = shopItem.image;
        shopItemCard.querySelector(".image").alt = shopItem.name;
        shopItemCard.querySelector(".description").innerText = `${shopItem.name}: ${shopItem.description}`;
        shopItemCard.querySelector(".card").addEventListener("click", () => buyItem(shopItem));

        renderInventory(shopItem.price, shopItemCard.querySelector(".price"), `price-${shopItem.name}`);
        shopItemsScreen.appendChild(shopItemCard);
    })
}

async function startGame() {
    try {
        const ores = await fetch("ores.json").then(r => r.json());
        if (savedGame.allOres.length === 0) savedGame.allOres = ores;

        const shopData = await fetch("shop.json").then(r => r.json());
        if (savedGame.shop.length === 0) savedGame.shop = shopData;

        const npcs = await fetch("npcs.json").then(r => r.json());
        allNpcs = npcs;

        renderShop();
        renderInventory();

        if (savedGame.level === 0) {
            await speak("general_nuggeta", 0);
        }

        generateNewOre(savedGame.currentOre);

    } catch (err) {
        console.error(err);
        alert("The Game Data did not load correctly. Please try to reload the Site.");
    }

    setInterval(() => {
        // employees
        oreDestroyingProgress.value -= savedGame.oreDamageOnTick * savedGame.efficiency;
        if (oreDestroyingProgress.value <= 0) {
            destroyOre();
        }

        // easter egg: special dialogue when you don't click
        if (performance.now() - lastOreClick >= 20_000 && lastOreClick) {
            speak("general_nuggeta", 17);
            lastOreClick = null; // to avoid speak multiple times for one event
        }

        // save the Game
        if ("everlyAPI" in window) {
            everlyAPI.saveGame(savedGame);
        } else {
            localStorage.setItem("save", JSON.stringify(savedGame));
        }
    }, 1000);
}
