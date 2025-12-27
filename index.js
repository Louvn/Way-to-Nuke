const gameScreen = document.getElementById("gameScreen");
const oreDestroyingProgress = document.getElementById("oreDestroyingProgress");
const inventoryScreen = document.getElementById("inventory");
const shop = document.getElementById("shop");
const shopItemsScreen = document.getElementById("shopItems");
const shopItemCardTemplate = document.getElementById("shopItemCardTemplate");
localStorage.clear()
// Load Saved Game
let savedGame;
if ("everlyAPI" in window) {
    everlyAPI.loadGame((data) => {
        savedGame = data;
        startGame();
    });
} else {
    savedGame = JSON.parse(localStorage.getItem("save"));
    startGame();
}

if (!savedGame) {
    savedGame = {
        oreDamageOnClick: 1,
        oreDamageOnTick: 0,
        level: 0,
        inventory: {},
        shop: [],
        allOres: [],
        currentOre: null
    }
};

let isPressed = false;

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

function renderInventory(inv = savedGame.inventory, invScreen = inventoryScreen, id = "inventory") {
    Object.entries(inv).forEach(([ore, value]) => {
        let existing = document.getElementById(`${id}-${ore}`);
        if (!existing) {
            existing = document.createElement("li");
            existing.id = (`${id}-${ore}`);
            existing.innerHTML = `<img src="./assets/${ore.toLowerCase()}_ore.png" alt=${ore}><span class="inventory-value"></span>`;
            invScreen.appendChild(existing);
        }
        const inventoryValue = existing.querySelector(".inventory-value");
        inventoryValue.innerText = value;
    });
}

function destroyOre(ore_id = savedGame.currentOre) {
    savedGame.level += 1;
    if (!savedGame.inventory[ore_id]) savedGame.inventory[ore_id] = 0;
    savedGame.inventory[ore_id] += 1;
    generateNewOre();
    renderInventory();
}

function onOreClick() {
    oreDestroyingProgress.value -= savedGame.oreDamageOnClick;
    if (oreDestroyingProgress.value <= 0) {
        destroyOre();
    }
}

function generateNewOre(id = null) {
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

function buyItem(item) {
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
            alert("You can not afford this Item.");
            return;
        }
    };
    if (!confirm("Do you want to buy " + item.name + "?")) return;
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

    // buyable & buyed
    const idx = savedGame.shop.findIndex((e) => e.name == item.name);
    savedGame.shop[idx].buyed += 1;
    if (savedGame.shop[idx].buyed >= savedGame.shop[idx].buyable) {
        savedGame.shop.splice(idx, 1);
        renderShop();
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

function startGame() {
    fetch("ores.json")
        .then(response => response.json())
        .then(data => {
            if (savedGame.allOres.length === 0) savedGame.allOres = data;

            fetch("shop.json")
                .then(response => response.json())
                .then(data => {
                    if (savedGame.shop.length === 0) savedGame.shop = data;
                    renderShop();
                    renderInventory();
                    generateNewOre(savedGame.currentOre);
                })
        })
        .catch(error => {
            console.error("Error while loading the ores.json and shop.json files:", error);
            alert("The Game Data did not load correctly. Please try to reload the Site.");
        })

    setInterval(() => {
        oreDestroyingProgress.value -= savedGame.oreDamageOnTick;
        if (oreDestroyingProgress.value <= 0) {
            destroyOre();
        }

        // save the Game
        if ("everlyAPI" in window) {
            everlyAPI.saveGame(savedGame);
        } else {
            localStorage.setItem("save", JSON.stringify(savedGame));
        }
    }, 1000);
}
