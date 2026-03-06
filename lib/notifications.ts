const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "af9ce9fc-ad08-4b55-9952-e91f6985b62f";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function sendPushNotification({
    userIds,
    title,
    message,
    url = "https://challenges.entropik.co",
}: {
    userIds: string[];
    title: string;
    message: string;
    url?: string;
}) {
    if (!ONESIGNAL_REST_API_KEY) {
        console.warn("ONE_SIGNAL_REST_API_KEY is not set. Skipping push notification.");
        return;
    }

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_player_ids: userIds,
                contents: { en: message },
                headings: { en: title },
                url: url,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}
