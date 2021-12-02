import { defs, tiny } from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Texture, Scene,
} = tiny;
const { Triangle, Square, Tetrahedron, Windmill, Subdivision_Sphere, Cylindrical_Tube, Textured_Phong } = defs;

class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}


export class CrossyBruins extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        const initial_corner_point = vec3(-15, -15, 0);
        const row_operation = (s, p) => p ? Mat4.translation(0, .2, 0).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t, p) => Mat4.translation(.2, 0, 0).times(p.to4(1)).to3();

        this.shapes = {
            sheet: new defs.Grid_Patch(150, 150, row_operation, column_operation),
            lane: new defs.Grid_Patch(20, 200, row_operation, column_operation),
            cube: new Cube(),
            sphere: new defs.Subdivision_Sphere(2),
            rock: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            bear: new Shape_From_File("assets/newbear.obj"),
            leaf: new Shape_From_File("assets/lilypad1.obj"),
        };

        // *** Materials
        this.materials = {
            floor: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#C1F376") }),
            road: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#555555") }),
            /*road: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/rgb.jpg", "NEAREST")
            }), // for textures when we need them */
            river: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#59bfff") }),
            bruin: new Material(new Textured_Phong(),
                { ambient: 1, texture: new Texture("assets/nolegbear_texture.png") }),   
            rock: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#999999") }),
            leaf: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#13ae4b") }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 20, 10), vec3(0, 0, 0), vec3(0, -1, 0));

        // detect movements 
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;

        // player's model transform 
        this.player_transform = Mat4.identity().times(Mat4.translation(0, -1, 1));
        this.attached = this.player_transform

        this.camera_location = this.initial_camera_location;

        this.lane_type = []; // holds randomly generated type of lane for all lanes  (0 = grass, 1 = road, 2 == river)
        this.lane_num = 1000; // constant for max number of generated lanes
        this.generate_lanes();

        this.rock_positions = {}; // dictionary for rocks positions: key = lane number, value = placement in lane 
        this.leaf_positions = {};  // dictionary for leaf positions: key = lane number, value = array/list for all placements of leafs in lane ({0: [2, 3, 12]})
        this.generate_rocks_and_leafs();

        this.score = 0;
    }

    generate_lanes() {
        var lane = [];
        for (let i = 0; i < this.lane_num; i++) {
            let val = Math.floor(Math.random() * 11);
            if (val < 5) {
                lane.push(0); // grass: 5/11 probability
            }
            else if (val < 10) {
                lane.push(1); //road: 5/11 probability
            }
            else {
                lane.push(2); // river has 1/11 probability
            }
        }
        this.lane_type = lane;
    }

    generate_rocks_and_leafs() {
        var rock_pos = {};
        var leaf_pos = {};
        for (let i = 0; i < this.lane_num; i++) {
            //generate rocks on grass areas
            //should_generate_rocks tells us whether or not we should add a rock to the lane (0 = no, 1 = yes)
            var should_generate_rock = Math.floor(Math.random() * 2);
            if (should_generate_rock === 1 && this.lane_type[i] === 0) { // only add rock if lane type is 0 (grass)
                var pos = Math.floor(Math.random() * 13); // gets random position for rock in lane
                if (pos < 6) {
                    rock_pos[i] = -1 * pos;
                } else {
                    rock_pos[i] = pos - 7;
                }
            }
            //generate leafs for river
            //only add leaf if lane type is 2 (river)
            else if (this.lane_type[i] === 2) {
                // all river lanes needed at least 1 leaf so player can cross
                // generate a random number between 1 and 6 for the number of leafs in a lane
                let num_leafs = Math.floor(Math.random() * 6);
                leaf_pos[i] = [];
                for (let j = 0; j < num_leafs + 1; j++) { // find a random position for all n leafs
                    let pos = Math.floor(Math.random() * 13);
                    if (pos < 6) {
                        leaf_pos[i].push(-1 * pos);
                    } else {
                        leaf_pos[i].push(pos - 7);
                    }
                }
            }
        }
        this.rock_positions = rock_pos;
        this.leaf_positions = leaf_pos;
        console.log(this.rock_positions)
    }

    make_control_panel() {
        this.live_string(box => {
            box.textContent = "Score: " + this.score
        });
        this.new_line();
        this.new_line();
        this.key_triggered_button("Up", ["u"], () => {
            this.moveUp = true;
        });
        this.key_triggered_button("Down", ["j"], () => {
            this.moveDown = true;
        });
        this.key_triggered_button("Left", ["h"], () => {
            this.moveLeft = true;
        });
        this.key_triggered_button("Right", ["k"], () => {
            this.moveRight = true;
        });

    }

    // NOTE: still need to figure out how to get camera to be angled
    // sets camera to be in player's pov (follows player)
    set_camera_view(program_state) {
        if (this.attached != undefined) {
            var blending_factor = 0.1, desired;
            desired = Mat4.inverse(this.attached.times(Mat4.translation(4, 8, 25)));
            desired = desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor));
            program_state.set_camera(desired);
        }
    }

    // if player hits one of the movement keys, translate player's coordinates in that direction 
    move_player() {
        if (this.moveUp) {
            this.player_transform = this.player_transform.times(Mat4.translation(0, 4, 0));
            this.score += 1;
            this.moveUp = false;
        }
        if (this.moveDown) {
            this.player_transform = this.player_transform.times(Mat4.translation(0, -4, 0));
            this.score -= 1;
            this.moveDown = false;
        }
        if (this.moveRight) {
            this.player_transform = this.player_transform.times(Mat4.translation(3, 0, 0));
            this.moveRight = false;
        }
        if (this.moveLeft) {
            this.player_transform = this.player_transform.times(Mat4.translation(-3, 0, 0));
            this.moveLeft = false;
        }
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 100000);

        //const light_position = vec4(0, 5, 5, 1);
        //program_state.lights = [new Light(vec4(0, 1, 1, 0), color(1, 1, 1, 1), 999999)];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        const angle = Math.sin(t);
        const light_position = Mat4.rotation(angle, 1, 0, 0).times(vec4(0, 0, 1, 0));
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000000)];

        //generate game scene
        for (var i = 0; i < this.lane_num; i++) { // generate every lane till max lanes
            if (this.lane_type[i] === 0) { // grass - currently green lanes
                this.shapes.lane.draw(context, program_state, model_transform, this.materials.floor);

                //rocks
                if (this.rock_positions[i] !== undefined) {
                    var rock_transform = model_transform.times(Mat4.translation(3 + this.rock_positions[i] * 3, -13, 1));
                    this.shapes.rock.draw(context, program_state, rock_transform, this.materials.rock);
                }
            } else if (this.lane_type[i] === 1) { //road - currently gray lanes 
                //this.shapes.lane.draw(context, program_state, model_transform, this.materials.floor.override({color: hex_color("#555555")}));
                this.shapes.lane.draw(context, program_state, model_transform, this.materials.road);
            } else { // river - currently blue lanes
                this.shapes.lane.draw(context, program_state, model_transform, this.materials.river);

                // leaf pads 
                for (let k = 0; k < this.leaf_positions[i].length; k++) {
                    var leaf_transform = model_transform.times(Mat4.translation(3 + this.leaf_positions[i][k] * 3, -13, 1));
                    this.shapes.leaf.draw(context, program_state, leaf_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0)), this.materials.leaf);
                }
            }
            model_transform = model_transform.times(Mat4.translation(0, 4, 0));
        }

        //player
        this.move_player();
        this.shapes.bear.draw(context, program_state, this.player_transform, this.materials.bruin);
        this.attached = this.player_transform;

        this.set_camera_view(program_state);
    }
}



