// 1. إعدادات السيرفر - تأكد من وضع قيمك الحقيقية هنا
const SUPABASE_URL = 'https://sblfxyqbqqbutpxakzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibGZ4eXFicXFidXRweGFrem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDQwMjUsImV4cCI6MjA5MDUyMDAyNX0.6KEvrgkWNLCrLqj1IquB4j5p1b4NkOyKOZ1HKyNDdCg'; // ضع مفتاح Anon هنا
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let map, userMarker, currentDriverName = "";

// 2. منطق تسجيل الدخول
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("خطأ في البيانات: " + error.message);
    } else {
        // جلب البروفايل فور نجاح الدخول
        await fetchDriverProfile(data.user.id);
        showMapScreen();
    }
});

// جلب اسم السائق من جدول profiles
async function fetchDriverProfile(userId) {
    try {
        // تم تغيير 'name' إلى 'full_name' ليتطابق مع قاعدة بياناتك
        let { data, error } = await _supabase
            .from('profiles')
            .select('full_name') 
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error("خطأ تقني في الطلب:", error);
            throw error;
        }

        if (data && data.full_name) {
            currentDriverName = data.full_name;
            console.log("تم جلب اسم السائق:", currentDriverName);
        } else {
            currentDriverName = "سائق جديد (بدون اسم)";
            console.warn("لم يتم العثور على اسم لهذا الـ ID في جدول profiles");
        }
        
        document.getElementById('driver-display-name').innerText = "السائق: " + currentDriverName;

    } catch (err) {
        console.error("فشل الاتصال بجدول profiles:", err.message);
        document.getElementById('driver-display-name').innerText = "خطأ في جلب الاسم";
    }
}
function showMapScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('map-screen').style.display = 'flex';
    initMap();
}

// 3. إعداد الخريطة
function initMap() {
    if (map) return;
    map = L.map('map').setView([24.7136, 46.6753], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// 4. إرسال الإحداثيات للجدول (locations) بالتعديلات الجديدة
document.getElementById('send-location-btn').addEventListener('click', () => {
    const status = document.getElementById('status-msg');
    status.innerText = "جاري جلب الموقع...";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latVal = position.coords.latitude;
            const lngVal = position.coords.longitude;

            // تحديث العلامة على الخريطة
            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([latVal, lngVal]).addTo(map).bindPopup("موقعك الآن").openPopup();
            map.setView([latVal, lngVal], 15);

            const { data: { user } } = await _supabase.auth.getUser();

            // المزامنة مع الأسماء الصحيحة للأعمدة في قاعدة بياناتك
            const { error } = await _supabase
                .from('locations')
                .insert([{ 
                    latitude: latVal,    // تم التعديل من lat إلى latitude
                    longitude: lngVal,   // تم التعديل من long إلى longitude
                    driver_name: currentDriverName,
                    user_id: user.id 
                }]);

            if (error) {
                console.error("تفاصيل الخطأ:", error);
                status.innerText = "خطأ في المزامنة: " + error.message;
            } else {
                status.innerText = "تم إرسال الإحداثيات بنجاح ✅";
                setTimeout(() => status.innerText = "", 3000);
            }
        }, (err) => {
            status.innerText = "فشل الوصول للموقع، تأكد من تفعيل الـ GPS";
        });
    } else {
        alert("المتصفح لا يدعم تحديد الموقع");
    }
});

// تسجيل الخروج
document.getElementById('logout-btn').addEventListener('click', async () => {
    await _supabase.auth.signOut();
    location.reload();
});