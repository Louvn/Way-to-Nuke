const gameScreen = document.getElementById("gameScreen");
const oreDestroyingProgress = document.getElementById("oreDestroyingProgress");
const inventoryScreen = document.getElementById("inventory");
const shop = document.getElementById("shop");
const shopItemsScreen = document.getElementById("shopItems");
const shopItemCardTemplate = document.getElementById("shopItemCardTemplate");

let oreDamageOnClick = 1;
let oreDamageOnTick = 0;

let isPressed = false;
let allOres = [];
let allShopItems = [];
let level = 0;
let inventory = {};
let currentOre = null;

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

function renderInventory(inv = inventory, invScreen = inventoryScreen, id = "inventory") {
    Object.entries(inv).forEach(([ore, value]) => {
        let existing = document.getElementById(`inventory-${ore}`);
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

function destroyOre(ore = currentOre) {
    level += 1;
    if (!inventory[ore.id]) inventory[ore.id] = 0;
    inventory[ore.id] += 1;
    generateNewOre();
    renderInventory();
}

function onOreClick() {
    oreDestroyingProgress.value -= oreDamageOnClick;
    if (oreDestroyingProgress.value <= 0) {
        destroyOre();
    }
}

function generateNewOre() {
    document.querySelectorAll(".ore-button").forEach(el => el.remove());
    const allOresAvailable = allOres.filter((value) => value.min_level <= level);
    const oreData = allOresAvailable[Math.floor(Math.random() * allOresAvailable.length)];

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
    
    currentOre = ore;
    gameScreen.appendChild(ore);
}

function openShop() {
    shop.classList.add("open");
}

function closeShop() {
    shop.classList.remove("open");
}

function buyItem(item) {
    const requirementsToBuy = Object.entries(item.price);

    for (const [ore, number] of requirementsToBuy) {
        let inInventory = false;
        Object.entries(inventory).forEach(([inventoryOre, inventoryNumber]) => {
            if (inventoryOre == ore && inventoryNumber >= number) inInventory = true;
        });
        if (!inInventory) {
            alert("You can not afford this Item.");
            return;
        }
    };
    if (!confirm("Do you want to buy " + item.name + "?")) return;
    requirementsToBuy.forEach(([ore, number]) => {
        inventory[ore] -= number;
    });
    renderInventory();

    let effect = item.effect;

    if (effect.click) {
        oreDamageOnClick += effect.click;
    }
    if (effect.tick) {
        oreDamageOnTick += effect.tick;
    }
}

function renderShop() {
    allShopItems.forEach(shopItem => {
        const shopItemCard = shopItemCardTemplate.content.cloneNode(true);
        shopItemCard.querySelector(".image").src = shopItem.image;
        shopItemCard.querySelector(".image").alt = shopItem.name;
        shopItemCard.querySelector(".description").innerText = shopItem.description;
        shopItemCard.querySelector(".card").addEventListener("click", () => buyItem(shopItem));

        renderInventory(shopItem.price, shopItemCard.querySelector(".price"), `price-${shopItem.name}`);
        shopItemsScreen.appendChild(shopItemCard);
    })
}

fetch("ores.json")
    .then(response => response.json())
    .then(data => {
        allOres = data;

        fetch("shop.json")
            .then(response => response.json())
            .then(data => {
                allShopItems = data;
                renderShop();
                generateNewOre();
            })
    })
    .catch(error => {
        console.error("Error while loading the ores.json and shop.json files:", error);
        alert("The Game Data did not load correctly. Please try to reload the Site.");
    })

setInterval(() => {
    oreDestroyingProgress.value -= oreDamageOnTick;
    if (oreDestroyingProgress.value <= 0) {
        destroyOre();
    }
}, 1000);