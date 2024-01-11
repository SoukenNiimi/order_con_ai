async function get_User_id() {
    let userId;
    await $.ajax({
        type: 'GET',
        url: '/get-user-id',
        success: function (data1) {
            userId = data1.userId;
        },
        error: function () {
            console.error('ユーザーIDの取得に失敗しました');
        }
    });
    return userId;
}

window.onload = async function () {
    const user_id = await get_User_id();
    $.ajax({
        type: 'GET',
        url: './get-dishes',
        data: { user_id: user_id },
        success: function (data) {
            const menuItems = document.querySelector('.menu-items');
            data.forEach(function (dish) {
                const menuItem = document.createElement('div');
                menuItem.id = `dish-${dish.dishid}`;
                menuItem.classList.add('menu-item');
                menuItem.innerHTML = `
                    <img src="${dish.image.replace(/\\/g, '/')}" width="50" height="50">
                    <h2>${dish.dish_name}</h2>
                    <p>${dish.price}円</p>
                `;
                dishes.push(dish);
                menuItems.appendChild(menuItem);
                menuItem.addEventListener('click', function () {
                    let cartItem = cart.find(item => item.dish_id === dish.dish_id);
                    if (cartItem) {
                        cartItem.quantity++;
                    } else {
                        dish.quantity = 1;
                        cart.push(dish);
                    }
                    updateCartDisplay();
                });
            });
        },
        error: function () {
            console.error('料理の取得に失敗しました');
        }
    });
};