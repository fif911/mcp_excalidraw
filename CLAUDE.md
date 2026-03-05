This is the list of agents we need in order of execution. Follow this workflow precisely.

1. Planner agent: 
   - Goal: create a plan for the main agent to create the diagram.
   - Needs to support both photo and text prompts/descriptions.

2. Main agent: 
   - Goal: using skills, python scripts and MCP server tools to build high quality diagrams.
   - Needs to create and run a python script which can be used to create diagrams (e.g. python_scripts/diagram_building/build-diagram-v41.py). 
   - Save them to python_scripts/diagram_building and name them with a version number.
   - Reuses components from components.py
   - Correctly adds icons from aws-icons-official on the diagram, judging by section contents.
   - Ensures elements do not overlap with one another (unless some arrows cross at some point).

3. Critic agent: 
   - Goal: to evaluate the quality of the diagrams, using skill to review diagrams, zoom into the picture for a better view (python_scripts/tools/crop_region.py). 
   - If the critic agent deems the diagram not suitable, it will ask the main agent to create a new diagram. 
   - It should use Agentic Vision if it struggles to detect the diagram elements.
   - Use excalidraw MCP if available to capture output diagram and compare to the input file.

4. Skills improvement agent: 
   - Goal: needs to make sense of what errors were encountered during the creation of the diagram and how they were resolved
   - This leads to updating the skills for future uses not to make the same errors again. 
   - Feedback from critic agent and user has to be evaluated and properly placed into skills files.
