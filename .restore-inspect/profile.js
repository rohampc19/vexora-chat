/* =====================================================
   VEXORA CHAT — PROFILE SYSTEM
   Profile + Avatar + Favorite Games + Logout
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const profileName = document.getElementById("profileName");
    const profileUsername = document.getElementById("profileUsername");
    const profileBio = document.getElementById("profileBio");

    const profileImageInput =
        document.getElementById("profileImageInput");

    const chooseProfileButton =
        document.getElementById("chooseProfileButton");

    const avatarPreview =
        document.getElementById("avatarPreview");

    const saveProfile =
        document.getElementById("saveProfile");

    const cancelProfile =
        document.getElementById("cancelProfile");

    const gameSelect =
        document.getElementById("gameSelect");

    const selectedGames =
        document.getElementById("selectedGames");

    const gameCount =
        document.getElementById("gameCount");

    const saveGames =
        document.getElementById("saveGames");

    const cancelGames =
        document.getElementById("cancelGames");

    const logoutButton =
        document.getElementById("logoutButton");


    /* =====================================================
       CHECK REQUIRED ELEMENTS
    ===================================================== */

    if (
        !profileName ||
        !profileUsername ||
        !profileBio ||
        !profileImageInput ||
        !chooseProfileButton ||
        !avatarPreview ||
        !saveProfile ||
        !cancelProfile ||
        !gameSelect ||
        !selectedGames ||
        !gameCount ||
        !saveGames ||
        !cancelGames ||
        !logoutButton
    ) {
        console.error(
            "VEXORA CHAT: بعضی از عناصر profile.html پیدا نشدند."
        );

        return;
    }


    /* =====================================================
       STORAGE KEYS
    ===================================================== */

    const PROFILE_KEY = "torexProfile";
    const GAMES_KEY = "torexFavoriteGames";


    /* =====================================================
       DEFAULT PROFILE
    ===================================================== */

    const defaultProfile = {
        name: "Roham",
        username: "roham",
        bio: "گیمر، عاشق بازی‌های جهان‌باز و دنبال‌کننده دنیای گیم 🎮",
        avatar: ""
    };


    /* =====================================================
       LOAD PROFILE
    ===================================================== */

    let profile = loadProfile();


    function loadProfile() {

        const saved =
            localStorage.getItem(PROFILE_KEY);

        if (!saved) {
            return { ...defaultProfile };
        }

        try {

            const parsed =
                JSON.parse(saved);

            return {
                ...defaultProfile,
                ...parsed
            };

        } catch (error) {

            console.error(
                "خطا در خواندن اطلاعات پروفایل:",
                error
            );

            return {
                ...defaultProfile
            };
        }
    }


    /* =====================================================
       SHOW AVATAR
    ===================================================== */

    function showAvatar(avatar) {

        if (avatar) {

            avatarPreview.innerHTML = "";

            avatarPreview.style.backgroundImage =
                `url("${avatar}")`;

            avatarPreview.style.backgroundSize =
                "cover";

            avatarPreview.style.backgroundPosition =
                "center";

            avatarPreview.style.backgroundRepeat =
                "no-repeat";

        } else {

            avatarPreview.innerHTML =
                '<i class="fa-solid fa-user"></i>';

            avatarPreview.style.backgroundImage =
                "none";
        }
    }


    /* =====================================================
       LOAD PROFILE INTO FORM
    ===================================================== */

    function renderProfile() {

        profileName.value =
            profile.name || "";

        profileUsername.value =
            profile.username || "";

        profileBio.value =
            profile.bio || "";

        showAvatar(
            profile.avatar || ""
        );
    }


    renderProfile();


    /* =====================================================
       PROFILE IMAGE BUTTON
    ===================================================== */

    chooseProfileButton.addEventListener(
        "click",
        function () {

            profileImageInput.click();

        }
    );


    /* =====================================================
       PROFILE IMAGE CHANGE
    ===================================================== */

    profileImageInput.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            if (!file) return;


            /* CHECK IMAGE */

            if (!file.type.startsWith("image/")) {

                alert(
                    "لطفاً فقط یک تصویر انتخاب کن."
                );

                this.value = "";

                return;
            }


            /* MAX 5MB */

            if (file.size > 5 * 1024 * 1024) {

                alert(
                    "حجم عکس نباید بیشتر از ۵ مگابایت باشد."
                );

                this.value = "";

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    showAvatar(
                        event.target.result
                    );

                };


            reader.onerror =
                function () {

                    alert(
                        "خواندن تصویر با مشکل مواجه شد."
                    );

                };


            reader.readAsDataURL(file);

        }
    );


    /* =====================================================
       SAVE PROFILE
    ===================================================== */

    saveProfile.addEventListener(
        "click",
        function () {

            const name =
                profileName.value.trim();

            const username =
                profileUsername.value
                    .trim()
                    .replace(/^@+/, "");

            const bio =
                profileBio.value.trim();


            /* NAME */

            if (!name) {

                alert(
                    "لطفاً نام خودت را وارد کن."
                );

                profileName.focus();

                return;
            }


            /* USERNAME */

            if (!username) {

                alert(
                    "لطفاً نام کاربری سایت را وارد کن."
                );

                profileUsername.focus();

                return;
            }


            if (username.length < 3) {

                alert(
                    "نام کاربری باید حداقل ۳ کاراکتر باشد."
                );

                profileUsername.focus();

                return;
            }


            /* GET AVATAR */

            let avatar =
                profile.avatar || "";


            const backgroundImage =
                avatarPreview.style.backgroundImage;


            if (
                backgroundImage &&
                backgroundImage !== "none"
            ) {

                const match =
                    backgroundImage.match(
                        /url\(["']?(.*?)["']?\)/
                    );

                if (
                    match &&
                    match[1]
                ) {

                    avatar =
                        match[1];

                }
            }


            /* CREATE PROFILE */

            profile = {

                name: name,

                username: username,

                bio: bio,

                avatar: avatar
            };


            /* SAVE */

            try {

                localStorage.setItem(
                    PROFILE_KEY,
                    JSON.stringify(profile)
                );

            } catch (error) {

                console.error(error);

                alert(
                    "ذخیره اطلاعات انجام نشد. ممکن است حافظه مرورگر پر باشد."
                );

                return;
            }


            /* UPDATE INPUT */

            profileUsername.value =
                username;


            alert(
                "تغییرات پروفایل با موفقیت ذخیره شد! 🎮"
            );

        }
    );


    /* =====================================================
       CANCEL PROFILE
    ===================================================== */

    cancelProfile.addEventListener(
        "click",
        function () {

            const result =
                confirm(
                    "تغییراتی که انجام دادی حذف شوند؟"
                );


            if (!result) return;


            profile =
                loadProfile();


            renderProfile();


            profileImageInput.value = "";


            alert(
                "تغییرات لغو شد."
            );

        }
    );


    /* =====================================================
       GAMES
    ===================================================== */

    let games = loadGames();


    /* =====================================================
       LOAD GAMES
    ===================================================== */

    function loadGames() {

        const saved =
            localStorage.getItem(GAMES_KEY);

        if (!saved) {
            return [];
        }

        try {

            const parsed =
                JSON.parse(saved);

            if (Array.isArray(parsed)) {

                return parsed;
            }

        } catch (error) {

            console.error(
                "خطا در خواندن بازی‌ها:",
                error
            );
        }

        return [];
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(text) {

        const div =
            document.createElement("div");

        div.textContent =
            text;

        return div.innerHTML;
    }


    /* =====================================================
       RENDER GAMES
    ===================================================== */

    function renderGames() {

        gameCount.textContent =
            `${games.length} / 3`;


        /* EMPTY */

        if (games.length === 0) {

            selectedGames.innerHTML = `

                <div class="empty-games">

                    <i class="fa-solid fa-gamepad"></i>

                    <p>
                        هنوز بازی‌ای انتخاب نکردی
                    </p>

                    <span>
                        حداقل ۳ بازی انتخاب کن
                    </span>

                </div>

            `;

            return;
        }


        selectedGames.innerHTML = "";


        games.forEach(
            function (game, index) {

                const card =
                    document.createElement("div");

                card.className =
                    "selected-game";


                card.innerHTML = `

                    <div class="selected-game-icon">

                        <i class="fa-solid fa-gamepad"></i>

                    </div>

                    <div class="selected-game-info">

                        <strong>
                            ${escapeHTML(game)}
                        </strong>

                        <span>
                            بازی مورد علاقه
                        </span>

                    </div>

                    <button
                        type="button"
                        class="remove-game"
                        aria-label="حذف بازی">

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                `;


                const removeButton =
                    card.querySelector(
                        ".remove-game"
                    );


                removeButton.addEventListener(
                    "click",
                    function () {

                        games.splice(
                            index,
                            1
                        );

                        renderGames();

                    }
                );


                selectedGames.appendChild(
                    card
                );

            }
        );

    }


    /* =====================================================
       ADD GAME
    ===================================================== */

    gameSelect.addEventListener(
        "change",
        function () {

            const game =
                this.value.trim();


            if (!game) return;


            /* DUPLICATE */

            if (games.includes(game)) {

                alert(
                    "این بازی قبلاً انتخاب شده."
                );

                this.value = "";

                return;
            }


            /* MAX 10 */

            if (games.length >= 10) {

                alert(
                    "حداکثر ۱۰ بازی می‌توانی انتخاب کنی."
                );

                this.value = "";

                return;
            }


            games.push(game);


            renderGames();


            this.value = "";

        }
    );


    /* =====================================================
       SAVE GAMES
    ===================================================== */

    saveGames.addEventListener(
        "click",
        function () {

            if (games.length < 3) {

                alert(
                    "برای ثبت تغییرات حداقل ۳ بازی انتخاب کن."
                );

                return;
            }


            try {

                localStorage.setItem(
                    GAMES_KEY,
                    JSON.stringify(games)
                );

            } catch (error) {

                console.error(error);

                alert(
                    "ذخیره بازی‌ها انجام نشد."
                );

                return;
            }


            alert(
                "بازی‌های مورد علاقه با موفقیت ذخیره شدند! 🎮"
            );

        }
    );


    /* =====================================================
       CANCEL GAMES
    ===================================================== */

    cancelGames.addEventListener(
        "click",
        function () {

            const result =
                confirm(
                    "تغییرات بازی‌ها لغو شوند؟"
                );


            if (!result) return;


            games =
                loadGames();


            renderGames();


            alert(
                "تغییرات بازی‌ها لغو شد."
            );

        }
    );


    /* =====================================================
       INITIAL GAMES
    ===================================================== */

    renderGames();


    /* =====================================================
       LOGOUT
    ===================================================== */

    logoutButton.addEventListener(
        "click",
        function () {

            const result =
                confirm(
                    "مطمئنی می‌خواهی از حساب خود خارج شوی؟"
                );


            if (!result) return;


            /*
                اطلاعات ورود حذف می‌شود.
                پروفایل و بازی‌های ذخیره‌شده
                باقی می‌مانند.
            */

            localStorage.removeItem(
                "torexUser"
            );

            localStorage.removeItem(
                "torexLoggedIn"
            );


            window.location.href =
                "login.html";

        }
    );

});