# Curricula

**This is a work in progress**

A web app for visualizing a course curriculum, showing course prerequisites and corequisites in a graph. See https://eschiebel.github.io/curricula.

The list of courses and their prereqs and coreqs are defined in a JSON file. A couple examples are provided in the `public/data` directory.
Courses show up in the graph in the order they are defined in the JSON file. Solid line arrows point from the prereq to the course.
Dashed line arrows point from the coreq to the course.

To provide your own curriculum, create the JSON file and load it using the "Choose File" button.

Once loaded, you can drag and drop courses between session/semester/quarter columns to adjust when your student will take each course.
After making changes you can use the "Save JSON" button to save your changes to a new JSON file.

## Building

To build the app, run 
```
npm install
npm run build
```

To run locally, run
```
npm run dev
```
then open https://localhost:5173/curricula

To deploy the app to github pages to github pages, edit the homepage url in package.json to point to your github pages url.
Then run 
```
npm run deploy
```
