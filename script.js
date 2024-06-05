let db;

// Delete the database
async function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase("shoppingCartDB");

    deleteRequest.onsuccess = () => {
      console.log("Database deleted successfully");
      resolve();
    };

    deleteRequest.onerror = (event) => {
      console.error("Error deleting database:", event.target.errorCode);
      reject(event.target.errorCode);
    };

    deleteRequest.onblocked = () => {
      console.log("Database delete blocked");
    };
  });
}

// Initialize the database
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("shoppingCartDB", 1);

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains("cartItems")) {
        db.createObjectStore("cartItems", {
          keyPath: "id",
          autoIncrement: true,
        });
        console.log("cartItems object store created");
      }

      if (!db.objectStoreNames.contains("shipping")) {
        const shippingStore = db.createObjectStore("shipping", {
          keyPath: "key",
        });
        shippingStore.transaction.oncomplete = () => {
          const transaction = db.transaction("shipping", "readwrite");
          const store = transaction.objectStore("shipping");
          store.add({ key: "shippingPrice", value: 4 }).onsuccess = () => {
            console.log("Initial shipping price added");
          };
        };
      }

      if (!db.objectStoreNames.contains("orders")) {
        db.createObjectStore("orders", {
          keyPath: "orderId",
          autoIncrement: true,
        });
        console.log("orders object store created");
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("IndexedDB initialized");
      resolve();
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

// Store initial cart items
async function storeInitialCartItems() {
  const initialCartItems = [
    {
      title: "Italy Pizza",
      subtitle: "Extra cheese and topping",
      imageUrl: "./assets/images/pizza.jpg",
      price: 681,
      quantity: 1,
    },
    {
      title: "Combo Plate",
      subtitle: "Extra cheese and topping",
      imageUrl: "./assets/images/combo.jpg",
      price: 681,
      quantity: 1,
    },
    {
      title: "Spanish Rice",
      subtitle: "Extra garlic",
      imageUrl: "./assets/images/rice.jpg",
      price: 681,
      quantity: 1,
    },
  ];

  const transaction = db.transaction(["cartItems"], "readwrite");
  const objectStore = transaction.objectStore("cartItems");

  initialCartItems.forEach((item) => {
    objectStore.add(item).onsuccess = (event) => {
      console.log("Item added:", event.target.result);
    };
  });

  transaction.oncomplete = () => {
    console.log("All initial cart items added to IndexedDB");
  };

  transaction.onerror = (event) => {
    console.error("Transaction error:", event.target.errorCode);
  };
}

// Get cart items
function getCartItems() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["cartItems"], "readonly");
    const objectStore = transaction.objectStore("cartItems");
    const request = objectStore.getAll();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.errorCode);
    };
  });
}

// Update cart item
function updateCartItem(item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["cartItems"], "readwrite");
    const objectStore = transaction.objectStore("cartItems");
    const request = objectStore.put(item);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.errorCode);
    };
  });
}

// Get shipping price
function getShippingPrice() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["shipping"], "readonly");
    const store = transaction.objectStore("shipping");
    const request = store.get("shippingPrice");

    request.onsuccess = (event) => {
      event.target.result
        ? resolve(event.target.result.value)
        : reject("No shipping price found");
    };

    request.onerror = (event) => {
      reject(event.target.errorCode);
    };
  });
}

// Render cart items
async function renderCartItems(items) {
  const cartContainer = document.getElementById("cart-container");
  cartContainer.innerHTML = "";

  let totalCost = 0;
  items.forEach((item) => {
    totalCost += item.price * item.quantity;

    const cartItemHtml = `
      <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-img-box">
              <img src="${item.imageUrl}" class="cart-item-img" />
          </div>
          <div class="cart-item-inner">
              <div class="cart-item-info">
                  <h1 class="cart-item-title">${item.title}</h1>
                  <h2 class="cart-item-subtitle">${item.subtitle}</h2>
              </div>
              <div class="cart-item-quantity">
                  <p class="quantity">${item.quantity}</p>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path class="increase-btn" d="M20 8.57143L10 0L0 8.57143H20Z" fill="#393939" />
                      <path class="decrease-btn" d="M20 11.4286L10 20L0 11.4286H20Z" fill="#393939" />
                  </svg>
              </div>
              <p class="cart-item-price">$${item.price * item.quantity}</p>
          </div>
          <img src="./assets/icons/trash.png" class="trash-icon" />
      </div>
    `;

    cartContainer.insertAdjacentHTML("beforeend", cartItemHtml);
  });

  document.getElementById("total-cost").textContent = `$${totalCost}`;

  try {
    const shippingPrice = await getShippingPrice();
    const totalTaxIncluded = totalCost + shippingPrice;
    document.getElementById("shipping").textContent = `$${shippingPrice}`;
    document.getElementById(
      "total-tax-incl"
    ).textContent = `$${totalTaxIncluded}`;
    document.getElementById(
      "total-tax-incl-2"
    ).textContent = `$${totalTaxIncluded}`;
  } catch (error) {
    console.error("Error retrieving shipping price:", error);
  }

  addQuantityEventListeners(items);
}

// Add event listeners for the increase and decrease buttons
function addQuantityEventListeners(items) {
  document.querySelectorAll(".increase-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const cartItemElement = this.closest(".cart-item");
      const itemId = parseInt(cartItemElement.getAttribute("data-id"));
      const item = items.find((i) => i.id === itemId);
      if (item) {
        item.quantity += 1;
        updateCartItem(item)
          .then(() => {
            renderCartItems(items);
          })
          .catch((error) => {
            console.error("Error updating cart item:", error);
          });
      }
    });
  });

  document.querySelectorAll(".decrease-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const cartItemElement = this.closest(".cart-item");
      const itemId = parseInt(cartItemElement.getAttribute("data-id"));
      const item = items.find((i) => i.id === itemId);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        updateCartItem(item)
          .then(() => {
            renderCartItems(items);
          })
          .catch((error) => {
            console.error("Error updating cart item:", error);
          });
      }
    });
  });
}

// Validate form fields and show error messages
function validateForm() {
  const nameOnCard = document.getElementById("name-on-card");
  const cardNumber = document.getElementById("card-number");
  const expirationDate = document.getElementById("expiration-date");
  const cvv = document.getElementById("cvv");

  let isValid = true;

  if (!nameOnCard.checkValidity()) {
    showErrorMessage(
      nameOnCard,
      "Name should be only capital letters and spaces."
    );
    isValid = false;
  } else {
    clearErrorMessage(nameOnCard);
  }

  if (!cardNumber.checkValidity()) {
    showErrorMessage(
      cardNumber,
      "Card number should be exactly 16 digits, with or without spaces."
    );
    isValid = false;
  } else {
    clearErrorMessage(cardNumber);
  }

  if (!expirationDate.checkValidity()) {
    showErrorMessage(
      expirationDate,
      "Expiration date should be in the format mm/yy."
    );
    isValid = false;
  } else {
    clearErrorMessage(expirationDate);
  }

  if (!cvv.checkValidity()) {
    showErrorMessage(cvv, "CVV should be exactly 3 digits.");
    isValid = false;
  } else {
    clearErrorMessage(cvv);
  }

  return isValid;
}

// Show error message below the input field
function showErrorMessage(input, message) {
  const errorElement = document.getElementById(`${input.id}-error`);
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

// Clear error message below the input field
function clearErrorMessage(input) {
  const errorElement = document.getElementById(`${input.id}-error`);
  errorElement.textContent = "";
  errorElement.style.display = "none";
}

// Handle checkout process
async function handleCheckout() {
  if (!validateForm()) return;

  try {
    const items = await getCartItems();
    const shippingPrice = await getShippingPrice();

    const order = {
      items,
      totalCost:
        items.reduce((total, item) => total + item.price * item.quantity, 0) +
        shippingPrice,
      shippingPrice,
      date: new Date().toISOString(),
    };

    const transaction = db.transaction(["orders"], "readwrite");
    const objectStore = transaction.objectStore("orders");
    const request = objectStore.add(order);

    request.onsuccess = () => {
      console.log("Order added:", request.result);
      alert("Order successfully placed!");
    };

    request.onerror = (event) => {
      console.error("Error adding order:", event.target.errorCode);
    };
  } catch (error) {
    console.error("Error during checkout:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await deleteDatabase();
    await initializeDatabase();
    await storeInitialCartItems();
    const items = await getCartItems();
    await renderCartItems(items);
  } catch (error) {
    console.error("Initialization error:", error);
  }

  document.getElementById("checkout-btn").addEventListener("click", (event) => {
    event.preventDefault();
    handleCheckout();
  });
});
