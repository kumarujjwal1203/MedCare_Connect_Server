import cron from "node-cron";
import Reminder from "../models/Reminder.model.js";
import User from "../models/User.model.js";

class ReminderJob {
  constructor() {
    this.job = null;
    this.notifications = [];
  }

  start() {
    this.job = cron.schedule("0 9 * * *", async () => {
      console.log("[ReminderJob] Running daily reminder check...");
      await this.processReminders();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    cron.schedule("0 */4 * * *", async () => {
      await this.sendPendingNotifications();
    });

    console.log("[ReminderJob] Reminder job scheduled for 9:00 AM daily");
  }

  stop() {
    if (this.job) {
      this.job.stop();
      console.log("[ReminderJob] Stopped");
    }
  }

  async processReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcomingReminders = await Reminder.find({
        scheduledDate: { $gte: today, $lt: tomorrow },
        isCompleted: false,
        notificationSent: false
      }).populate("userId", "name email");

      for (const reminder of upcomingReminders) {
        const notification = {
          userId: reminder.userId._id,
          userEmail: reminder.userId.email,
          userName: reminder.userId.name,
          reminderId: reminder._id,
          title: reminder.title,
          description: reminder.description,
          type: reminder.type,
          scheduledDate: reminder.scheduledDate,
          createdAt: new Date()
        };

        this.notifications.push(notification);

        reminder.notificationSent = true;
        await reminder.save();

        console.log(`[ReminderJob] Created notification for: ${reminder.title}`);
      }

      await this.autoGenerateReminders();
      await this.cleanupOldReminders();

      console.log(`[ReminderJob] Processed ${upcomingReminders.length} reminders`);
    } catch (error) {
      console.error("[ReminderJob] Error processing reminders:", error.message);
    }
  }

  async autoGenerateReminders() {
    try {
      const usersWithRisk = await User.find({
        $or: [
          { age: { $gte: 50 } },
          { chronicConditions: { $exists: true, $ne: [] } }
        ]
      }).select("_id");

      const existingAnnualCheckup = await Reminder.findOne({
        userId: { $in: usersWithRisk.map((u) => u._id) },
        type: "checkup",
        scheduledDate: {
          $gte: new Date(),
          $lt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });

      if (!existingAnnualCheckup) {
        for (const user of usersWithRisk) {
          const sixMonthsLater = new Date();
          sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

          await Reminder.create({
            userId: user._id,
            type: "checkup",
            title: "Annual Health Checkup Due",
            description: "Regular health screening recommended for your age/risk profile",
            scheduledDate: sixMonthsLater
          });
        }

        console.log(`[ReminderJob] Auto-generated checkup reminders for ${usersWithRisk.length} users`);
      }
    } catch (error) {
      console.error("[ReminderJob] Error generating auto reminders:", error.message);
    }
  }

  async cleanupOldReminders() {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await Reminder.deleteMany({
        isCompleted: true,
        createdAt: { $lt: ninetyDaysAgo }
      });

      if (result.deletedCount > 0) {
        console.log(`[ReminderJob] Cleaned up ${result.deletedCount} old completed reminders`);
      }
    } catch (error) {
      console.error("[ReminderJob] Error cleaning up reminders:", error.message);
    }
  }

  async sendPendingNotifications() {
    try {
      const pendingNotifications = this.notifications.filter((n) => !n.sent);

      for (const notification of pendingNotifications) {
        await this.sendEmailNotification(notification);
        notification.sent = true;
      }

      this.notifications = this.notifications.filter((n) => !n.sent);

      if (pendingNotifications.length > 0) {
        console.log(`[ReminderJob] Sent ${pendingNotifications.length} notifications`);
      }
    } catch (error) {
      console.error("[ReminderJob] Error sending notifications:", error.message);
    }
  }

  async sendEmailNotification(notification) {
    console.log(`[Email] To: ${notification.userEmail}`);
    console.log(`[Email] Subject: Reminder - ${notification.title}`);
    console.log(`[Email] Body: ${notification.description || "You have a health reminder scheduled for today."}`);
  }

  getNotifications(userId) {
    return this.notifications.filter((n) => n.userId.toString() === userId.toString());
  }

  clearNotifications(userId) {
    this.notifications = this.notifications.filter(
      (n) => n.userId.toString() !== userId.toString()
    );
  }
}

export default new ReminderJob();
