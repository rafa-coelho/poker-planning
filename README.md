# Poker Planning App 🃏

[Leia em Portguês](./LEIAME.md)

## 📌 About the Project

The **Poker Planning App** is a collaborative tool for effort estimation in agile development teams. Supporting multiple players and featuring a dynamic interface, this tool allows participants to vote interactively, ensuring an efficient and participative decision-making process.

## 🚀 Technologies Used

- **Frontend:** Next.js (React) + TailwindCSS  
- **Backend:** Node.js + Express + Socket.io  
- **Database:** In-memory (temporary server-side storage)  
- **Authentication:** LocalStorage-based session  
- **Deployment:** Configured for Docker, Vercel, or other environments  

## 🎮 Features

✔️ Create and join rooms with a custom name  
✔️ Interactive voting with Poker Planning cards  
✔️ Vote reveal system with animations and statistics  
✔️ Responsive and modern user interface  
✔️ Real-time communication via WebSockets  
✔️ Toasts and modals for an enhanced user experience  

## 👥 Installation and Setup

### 🔧 Prerequisites

- Node.js **>= 16.x**  
- npm or yarn  

### 🛠️ Step by Step

1. **Clone the repository**  
   ```sh
   git clone https://github.com/your-username/poker-planning.git
   cd poker-planning
   ```
2. **Install dependencies**  
   ```sh
   npm install
   # or
   yarn install
   ```
3. **Run**  
   ```sh
   npm run dev
   ```
4. **Access in your browser**  
   ```sh
   http://localhost:3000
   ```

## 🎲 How to Use

### Creating a session

1. Go to the homepage and enter a session name.  
2. Click "Create Session" and share the generated link.  

### Joining a session

1. Open the shared link or manually enter the session URL.  
2. Enter your name and click "Join."  

### Voting and revealing

1. Select a card with your estimation.  
2. The moderator can click "Reveal" to display the votes.  
3. The system calculates the average votes and shows an "agreement thermometer."  

## 🌍 Internationalization (i18n)

The application supports multiple languages. Available translations include:

- **Portuguese (pt-BR)**  
- **English (en-US)**  

To add a new language, simply include the translations in `i18n/index.ts`.

## 🤝 Contribution

Contributions are welcome! To contribute:

1. **Fork** the repository  
2. Create a **branch** with your feature/fix (`git checkout -b new-feature`)  
3. **Commit** your changes (`git commit -m 'Adding new feature'`)  
4. **Push** to the branch (`git push origin new-feature`)  
5. Open a **Pull Request** 🚀  

## 🐟 License

This project is under the **MIT** license. Feel free to use and modify it as needed!

---

🌟 Need help or want to give feedback? Get in touch! 🚀

