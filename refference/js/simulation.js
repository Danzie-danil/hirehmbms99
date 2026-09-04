
window.startLiveSimulation = function () {
    if (state.role !== 'owner') return;

    setInterval(() => {
        if (Math.random() > 0.65) {
            const branch = state.branches[Math.floor(Math.random() * state.branches.length)];
            const types = ['sale', 'expense', 'task_completed'];
            const type = types[Math.floor(Math.random() * types.length)];

            let message, amount;
            if (type === 'sale') {
                amount = Math.floor(Math.random() * 600) + 50;
                message = `New sale recorded`;
                branch.todaySales += amount;
            } else if (type === 'expense') {
                amount = Math.floor(Math.random() * 250) + 20;
                message = `New expense: Office supplies`;
            } else {
                message = `Task completed: Daily inventory check`;
            }
            addActivity(type, message, branch.name, amount);
        }
    }, 5000);
};

window.addActivity = function (type, message, branchName, amount = null) {
    const activity = { type, message, branch: branchName, amount, time: fmt.time() };
    state.activities.push(activity);

    const feed = document.getElementById('activityFeed');
    if (feed) {
        feed.innerHTML = renderActivities();
        lucide.createIcons();
    }

    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.remove('hidden');
};
