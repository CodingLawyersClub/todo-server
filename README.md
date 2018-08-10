# Getting started

Setting up for local usage:

- Clone this repo
- `yarn` to install all required dependencies
- Run `brew install mongodb` 
- After installing mongodb, run `sudo mkdir -p /data/db`
- Make it accessible to root user `sudo chmod -R go+w /data/db`

# Running
- Make sure mongo is running with the `mongod` command
- Connect via Compass to localhost
- Create Database
  - Database Name: todo
- Clone template backend: `git clone git@github.com:CodingLawyersClub/template-backend.git todo-server`
- `cd todo-server`
- `yarn`
- Search for *** throughout the app:
  - Replace secret with a random string longer than 15 characters, with letters and numbers https://www.random.org/strings/
  - Replace the database with: “todo”
  - Replace email with whatever you want and your email: Todo Admin <youremail@example.com>
- `yarn dev`
