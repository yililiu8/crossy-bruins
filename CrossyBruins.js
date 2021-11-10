import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;
const {Triangle, Square, Tetrahedron, Windmill, Subdivision_Sphere} = defs;

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
                cube: new Cube(),
                sphere: new defs.Subdivision_Sphere(2),
                bear: new Shape_From_File("assets/bear.obj"),
            };
    
            // *** Materials
            this.materials = {
                floor: new Material(new defs.Phong_Shader(),
                    {ambient: 1, diffusivity: .6, color: hex_color("#C1F376")}),
                bruin: new Material(new defs.Phong_Shader(),
                    {ambient: 1, diffusivity: .6, color: hex_color("#964B00"), specularity: 1}),
            }
    
            this.initial_camera_location = Mat4.look_at(vec3(0, 20, 10), vec3(0, 0, 0), vec3(0, -1, 0));

            this.moveUp = false;
            this.moveDown = false; 
            this.moveLeft = false; 
            this.moveRight = false; 
            
            this.player_transform = Mat4.identity().times(Mat4.translation(0, 0, 1)); 
            this.attached = this.player_transform

            this.camera_location = this.initial_camera_location;
            
        }
    
        make_control_panel() {
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

        // need to figure out how to get camera to be angled
        set_camera_view(program_state) {
            if (this.attached != undefined) {
                var blending_factor = 0.1, desired;
                desired = Mat4.inverse(this.attached.times(Mat4.translation(2, 8, 25))); 
                desired = desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, blending_factor)); 
                program_state.set_camera(desired);
            }
        }

        move_player() {
            if (this.moveUp) {
                this.player_transform = this.player_transform.times(Mat4.translation(0, 2, 0)); 
                this.moveUp = false; 
            } 
            if (this.moveDown) {
                this.player_transform = this.player_transform.times(Mat4.translation(0, -2, 0));
                this.moveDown = false; 
            } 
            if (this.moveRight) {
                this.player_transform = this.player_transform.times(Mat4.translation(2, 0, 0));
                this.moveRight = false; 
            }
            if (this.moveLeft) {
                this.player_transform = this.player_transform.times(Mat4.translation(-2, 0, 0));
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
                Math.PI / 4, context.width / context.height, .1, 1000);
                
            const light_position = vec4(0, 5, 5, 1);
            program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10)];

            const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
            let model_transform = Mat4.identity();
            
            //floor
            this.shapes.sheet.draw(context, program_state, model_transform, this.materials.floor);
            
            this.move_player(); 
            
            //player
            this.shapes.sphere.draw(context, program_state, this.player_transform, this.materials.bruin);
            this.attached = this.player_transform; 

            this.set_camera_view(program_state); 
        }
    }
    
    