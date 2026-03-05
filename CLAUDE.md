This is the list of agents we need:

1. Planner agent: 
   - goal: create a plan for the main agent to create the diagram.
   - Needs to support both photo and text prompts/descriptions.

2. Main agent: 
   - goal: using skills, python scripts and MCP server tools to build high quality diagrams.
   - Needs to create and run a python script which can be used to create diagrams (e.g. python_scripts/diagram_building/build-diagram-v41.py). 
   - Save them to python_scripts/diagram_building and name them with a version number.
   - Reuses components from components.py
   - Correctly adds icons from aws-icons-official on the diagram, judging by section contents.
   - Ensures elements do not overlap with one another (unless some arrows cross at some point)

3. Critic agent: 
   - goal: to evaluate the quality of the diagrams, using skill to review diagrams, zoom into the picture for a better view (python_scripts/tools/crop_region.py). 
   - If the critic agent deems the diagram not suitable, it will ask the main agent to create a new diagram. 
   - It should use Agentic Vision if it struggles to detect the diagram elements.

4. Skills improvement agent: 
   - goal: needs to make sense of what errors were encountered during the creation of the diagram and how they were resolved, thus updating the skills for future uses not to make the same errors again.
