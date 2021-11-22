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

class Car {
    constructor(model_transform, color, direction) {
        this.model_transform = model_transform;
        let colors = [hex_color("#FF0000"), hex_color("#00FF00"), hex_color("#673AB7"), hex_color("#03A9F4"), hex_color("#FFFF33")]; // red, green, purple, blue, yellow
        this.color = colors[Math.floor(Math.random() * 5)];
        this.direction = direction
        //may also need a car type if we have multiple types of cars
    }

    getDirection() {
        return this.direction; // 1 = right, -1 = left
    }

    getPosition() {
        return this.model_transform; 
    }

    getColor() {
        return this.color;
    }

    setPosition(pos) {
        this.model_transform = pos; 
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
            lane: new defs.Grid_Patch(20, 200, row_operation, column_operation, [[0, 10], [0, 1]]),
            cube: new Cube(),
            sphere: new defs.Subdivision_Sphere(2),
            rock: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            bear: new Shape_From_File("assets/bear3.obj"),
            leaf: new defs.Capped_Cylinder(0.05, 10)
        };

        // *** Materials
        this.materials = {
            floor: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#C1F376") }),
            road: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#555555") }),
            texturedGrass: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/grasslane.png")
            }),
            texturedRiver: new Material(new  Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/riverlane.jpg")
            }),
            texturedRoad: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/roadlane.png") // roadlane.png or road2.jpg
            }),
            river: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#59bfff") }),
            bruin: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#964B00"), specularity: 1 }),
            rock: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#999999") }),
            leaf: new Material(new defs.Phong_Shader(),
                { ambient: 1, diffusivity: .6, color: hex_color("#13ae4b") })
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
        this.car_positions = {}; // dictionary for car positions: key = lane number, value = array/list of Mat4 (model transforms) for all cars in lane
        this.generate_rocks_and_leafs();
        this.generate_cars(); 

        this.car_lane_min = 0; 
        this.car_lane_max = 19; 

        this.car_speed = 0.1;  
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

                if(i !== 0 && this.lane_type[i-1] === 2) {
                    leaf_pos[i-1].push(leaf_pos[i][0]); // at least one leaf needs to be in the same column if there are two rivers in a row
                }
            }
        }
        this.rock_positions = rock_pos;
        this.leaf_positions = leaf_pos;
        console.log(this.rock_positions)
    }

    generate_cars_for_lane() {
        var pos = []; 
        let direction = Math.floor(Math.random() * 2) == 0? -1 : 1; 
        var x_pos = Math.floor(Math.random() * 5) - 15;
        let car_num = Math.floor(Math.random() * 2) == 0 ? 3 : 4; // vary car num per lane so it doesn't look too uniform
        for(let i = 0; i < car_num; i++) {
            var dist_between = Math.floor(Math.random() * 4); // get random distance between cars
            let car_transform = Mat4.identity().times(Mat4.translation(dist_between + x_pos, -1, 1));
            pos.push(new Car(car_transform, 0, direction)); 
            //pos.push(Mat4.identity().times(Mat4.translation(dist_between + x_pos, -1, 1)));
            x_pos += (car_num == 4 ? 9 : 13) + dist_between;
        }
        return pos; 
    }

    generate_cars() {
        // start off game by only generating 20 lanes of car positions to save memory/be more efficient - use dynamic instantiation as game goes on
        var car_pos = {};
        for(let i = 0; i < 20; i++) {
            car_pos[i] = this.generate_cars_for_lane();
        }
        this.car_positions = car_pos;
        //console.log(this.car_positions);
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
            this.car_speed += .001; // as the score gets higher, car speed gets faster too

            this.car_dynamic_instantiation(1); 
        }
        if (this.moveDown) {
            this.player_transform = this.player_transform.times(Mat4.translation(0, -4, 0));
            this.score -= 1;
            this.moveDown = false;
            this.car_speed -= .001; 

            this.car_dynamic_instantiation(-1); 
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

    // only keeping track of the lanes that we can see / are coming up saves memory 
    car_dynamic_instantiation(dir) {
        if(dir === 1) { // 1 = up 
            delete this.car_positions[this.car_lane_min];
            this.car_lane_min += 1; 
            this.car_positions[this.car_lane_max] = this.generate_cars_for_lane();
            this.car_lane_max += 1; 
        }
        else { // -1 = down
            delete this.car_positions[this.car_lane_max];
            this.car_lane_min -= 1; 
            this.car_positions[this.car_lane_min] = this.generate_cars_for_lane();
            this.car_lane_max -= 1; 
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
                this.shapes.lane.draw(context, program_state, model_transform, this.materials.texturedGrass);

                //rocks
                if (this.rock_positions[i] !== undefined) {
                    var rock_transform = model_transform.times(Mat4.translation(3 + this.rock_positions[i] * 3, -13, 1));
                    this.shapes.rock.draw(context, program_state, rock_transform, this.materials.rock);
                }
            } else if (this.lane_type[i] === 1) { //road - currently gray lanes
                this.shapes.lane.draw(context, program_state, model_transform, this.materials.texturedRoad);

                // cars
                if (this.car_positions[i] !== undefined) {
                    for(let k = 0; k < this.car_positions[i].length; k++) {
                        let car_transform = this.car_positions[i][k].getPosition(); 
                        let dir = this.car_positions[i][k].getDirection(); 
                        let color = this.car_positions[i][k].getColor(); 
                        this.shapes.cube.draw(context, program_state, model_transform.times(car_transform).times(Mat4.translation(0, -12, 1)), this.materials.rock.override({color: color}));
                        this.car_positions[i][k].setPosition(car_transform.times(Mat4.translation(this.car_speed * dir, 0, 0)));

                        // dynamic instantiation for car - if car reaches end of board -> reset it's position to very begining of board
                        if((car_transform[0][3] > 24 && dir === 1) || (car_transform[0][3] < -14 && dir === -1)) { 
                            // replace out of bounds car with new one
                            let start_loc = dir === 1 ? -14 : 24; 
                            this.car_positions[i].splice(k, 1, new Car(Mat4.identity().times(Mat4.translation(start_loc, -1, 1)), 0, dir)); 
                        }
                    }
                }
            } else { // river - currently blue lanes
                this.shapes.lane.draw(context, program_state, model_transform, this.materials.texturedRiver);

                // leaf pads 
                for (let k = 0; k < this.leaf_positions[i].length; k++) {
                    var leaf_transform = model_transform.times(Mat4.translation(3 + this.leaf_positions[i][k] * 3, -13, 1));
                    this.shapes.leaf.draw(context, program_state, leaf_transform, this.materials.leaf);
                }
            }
            model_transform = model_transform.times(Mat4.translation(0, 4, 0));
        }

        //player
        this.move_player();
        this.shapes.cube.draw(context, program_state, this.player_transform, this.materials.bruin);
        this.attached = this.player_transform;

        this.set_camera_view(program_state);
    }
}
