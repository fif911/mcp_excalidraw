This is the list of agents we need in order of execution. Follow this workflow precisely.

1. Planner agent: 
   - Goal: create a plan for the main agent to create the diagram.
   - Needs to support both photo and text prompts/descriptions.
   - There need to be two plans: 
     - components_plan.txt where we list all the components used on the diagram and their connections and descriptions.
     - components_styling.txt where we list all the styling options for the components, colors, sizing, etc.

2. Main agent: 
   - Goal: using skills, python scripts and MCP server tools to build high quality diagrams.
   - Tasks:
   - Needs to create and run a python script which can be used to create diagrams (e.g. python_scripts/diagram_building/build-diagram-v41.py). 
   - Save them to python_scripts/diagram_building and name them with a version number.
   - Reuses components from components.py
   - Correctly adds icons from aws-icons-official on the diagram, judging by section contents.
   - Ensures elements do not overlap with one another (unless some arrows cross at some point).
   - It is free to create new components if they are missing from the components.py file and adjust them accordingly.
   - Based on the critic agent/user feedback, adjust the skills and change components if needed to accommodate the new design.
   - When it creates/changes components, it needs to keep them as generalized as possible so they work for many diagrams, not just the one we are building now.


3. Critic agent: 
   - Goal: to evaluate the quality of the diagrams, using skill to review diagrams, zoom into the picture for a better view (python_scripts/tools/crop_region.py). 
   - If the critic agent deems the diagram not suitable, it will ask the main agent to create a new diagram. 
   - It should use Agentic Vision if it struggles to detect the diagram elements.
   - Use excalidraw MCP if available to capture output diagram and compare to the input file.
   - It should be able to detect and correct the following errors:
     - Missing icons
     - Overlapping elements
     - Incorrectly sized elements
     - Incorrectly positioned elements
     - Incorrectly colored elements
     - Incorrectly sized text
     - Incorrectly positioned text
     - Arrows starting not from the center of the element or ending not at the center of another element.
     - Arrow