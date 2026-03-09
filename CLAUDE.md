This is the list of agents we need in order of execution. Follow this workflow precisely.

1. Planner agent: 
   - Goal: create a plan for the main agent to create the diagram.
   - Needs to support both photo and text prompts/descriptions.
   - There need to be two plans with folder structure diagram_building/v_{number of version} (e.g. diagram_building/v44, this is our number 1, then count from the previous version):
     - components_plan.txt where we list all the components used on the diagram and their connections and descriptions.
     - components_styling.txt where we list all the styling options for the components, colors, sizing, etc.

2. Main agent: 
   - Goal: using skills, python scripts and MCP server tools to build high-quality diagrams.
   - Tasks:
     - Needs to create a diagram by the plan described the components_plan.txt and components_styling.txt.
     - Needs to create and run a python script which can be used to create diagrams (e.g. diagram_building/v44/build-diagram.py). 
     - Save them to python_scripts/diagram_building and name them with a version number.
     - Reuses components from components.py
     - Correctly adds icons from aws-icons-official on the diagram, judging by section contents. Do not perform manual searches, always use tool excalidraw - search_aws_icons (MCP)/ for this task, properly setting the parameters.
     - For each icon keep proper track of light and dark background versions, many icons have both and it needs to choose the proper one.
     - Ensures elements do not overlap with one another (unless some arrows cross at some point).
     - It is free to create new components if they are missing from the components.py file and adjust them accordingly.
     - Based on the critic agent/user feedback, adjust the skills and change components if needed to accommodate the new design.
     - When it creates/changes components, it needs to keep them as generalized as possible so they work for many diagrams, not just the one we are building now.

3. Critic agent: 
   - Goal: to evaluate the quality of the diagrams, using skill to review diagrams. 
   - If the critic agent deems the diagram not suitable, it will ask the main agent to create a new diagram. 
   - It should use Agentic Vision if it struggles to detect the diagram elements.
   - Use excalidraw MCP if available to capture output diagram and compare to the input file, looking closely to spot all the differences, zooming into the picture for a better view (skills/diagram-review/crop_region.py).
   - Reading components_plan.txt and components_styling.txt and identifying errors in the diagram and where it does not match the plan.
   - Using skills and scripts from skills/diagram-review. Following the checklist in the reference.
   - It should be able to detect the following errors:
     - Sections not in the correct order or hierarchy.
     - Missing sections.
     - Missing elements.
     - Wrong section names and border styles
     - Missing icons
     - Overlapping elements
     - Incorrectly sized elements
     - Incorrectly positioned elements
     - Incorrectly colored elements
     - Incorrectly sized text
     - Incorrectly positioned text
     - Arrows starting not from the center of the element or ending not at the center of another element.
     - Arrows pointing to the wrong direction. 
     - Arrows connecting elements that are not connected ot not connecting elements that are connected.
     - Arrows overlapping with text or ending not at the end of an element, either reaching into the icon or having some space between the icon and arrow end.
     - Other errors that are not covered by the above.