import React, { useEffect, useState, useReducer } from 'react';
import { createContext } from 'react';
import { openDB } from 'idb';

const FileContext = createContext();

const resultFilesReducer = (state, action) => {
    switch(action.type){
        case "segmentation": return {...state, segmentation:action.value};
    
        case "graph": return{...state, graph:action.value};
    
        case "layer": return {...state, segmentation:
            state.segmentation.map(item => item.class===action.value.class? 
            {...item, png:action.value}:item )  
        }

        case "tile_split":return {
            ...state,
            segmentation: state.segmentation.map(item => {
            if (item.class === action.value.class) {
                return {
                ...item,
                split: {
                    ...item.split,
                    [action.value.row]: {
                    ...item.split[action.value.row],
                    [action.value.column]: action.value.value
                    }
                }
                };
            }
            return item;
            })
            }

        case "layer_split":return {...state, segmentation:
            state.segmentation.map(item => item.class===action.value.class? 
            {...item, split:action.value}:item )  
        }

        case "all_split": return {...state, segmentation:
        state.segmentation.map(item => { return {...item, split:action.value[item.class]}})
        }

        case "all_result":
        return {
            segmentation: action.value?.segmentation?.map((item, index) => ({
                ...item,
                split: item.split || state.segmentation[index]?.split || { row_0: { column_0: '' } }
            })) || state.segmentation,
            graph: action.value?.graph || state.graph,
        };
  
        case "all":
            return {
            segmentation: action.value?.segmentation || state.segmentation,
            graph: action.value?.graph || state.graph,
            };

        case 'edit_segmentation':
            return {
                graph:state.graph,
                segmentation: action.value.segmentation.map((item, index) => ({
                    ...item,
                    split: state.segmentation[index]?.split || { row_0: { column_0: '' } },
                    png: action.value.segmentation[index]
                }))
            }
    
        default: return state;
  };
  };

const initialResultFilesState = {
    segmentation:[
        {class:"wall", png:"", split:{row_0:{column_0:''}}},
        {class:"doorway", png:"", split:{row_0:{column_0:''}}},
        {class:"window", png:"", split:{row_0:{column_0:''}}},
        {class:"appartment_unit", png:"", split:{row_0:{column_0:''}}},
        {class:"hallway", png:"", split:{row_0:{column_0:''}}},
        {class:"elevator", png:"", split:{row_0:{column_0:''}}}, 
        {class:"stairwell", png:"", split:{row_0:{column_0:''}}},
        {class:"public_ammenity", png:"", split:{row_0:{column_0:''}}},
        {class:"balcony", png:"", split:{row_0:{column_0:''}}},
      ],
      graph:{
        nodes:[],
        edges:[]
      }
}

const dbPromise = openDB('file-store', 4, {
    upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files');
        }
        if (!db.objectStoreNames.contains('resultFiles')) {
            db.createObjectStore('resultFiles');
        }
        if (oldVersion < 4) {
            db.clear('files');
        }
    },
});

const FileProvider = ({ children }) => {
    const [floorplan, setFloorplan] = useState({ 
        png:null,
        split:{}
    });
    const [resultFiles, resultFilesDispatch] = useReducer(resultFilesReducer, initialResultFilesState);
    const [viewLayers, setViewLayers] = useState({
        wall:true,
        doorway:false,
        window:false,
        appartment_unit:false,
        hallway:false,
        elevator:false,
        stairwell:false,
        public_ammenity:false,
        balcony:false,
      });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updateState, setUpdateState]=useState('inference');


    // Load files from IndexedDB on mount
    useEffect(() => {
        let isMounted = true;

        const loadFiles = async () => {
            try {
                setLoading(true);
                const db = await dbPromise;
                const tx = db.transaction('files', 'readonly');
                const store = tx.objectStore('files');
                const floorplan = await store.get('floorplan');

                const tx_result = db.transaction('resultFiles', 'readonly');
                const store_result = tx_result.objectStore('resultFiles');
                const resultFiles = await store_result.get('results');

                if (isMounted) {
                    setFloorplan(floorplan || { 
                        png: null,
                        split: {}
                    });
                    resultFilesDispatch({type:'all', value:resultFiles});
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || 'Failed to load files from IndexedDB');
                    console.error('IndexedDB load error:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadFiles();

        return () => {
            isMounted = false;
        };
    }, []);

    // Save files to IndexedDB when they change
    useEffect(() => {
        const saveFiles = async () => {
            try {
                const db = await dbPromise;
                const tx = db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');

                // console.log('Saving to IndexedDB:', files); // Debug log

                await store.put(floorplan, 'floorplan');
                await tx.done;
            } catch (err) {
                console.error('IndexedDB save error:', err);
            }
        };
        console.log("Floorplan: ",floorplan)

        if (!loading) {
            // Only save after initial load to avoid overwriting with null
            saveFiles();
        }
    }, [floorplan]);

    useEffect(() => {
        const saveFiles = async () => {
            try {
                const db = await dbPromise;
                const tx = db.transaction('resultFiles', 'readwrite');
                const store = tx.objectStore('resultFiles');

                // console.log('Saving to IndexedDB:', files); // Debug log

                await store.put(resultFiles, 'results');
                await tx.done;
            } catch (err) {
                console.error('IndexedDB save error:', err);
            }
        };
        console.log('Result files:', resultFiles)

        if (!loading) {
            // Only save after initial load to avoid overwriting with null
            saveFiles();
        }
    }, [resultFiles]);

    const clearFiles = async () => {
        const db = await dbPromise;
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        await store.delete('floorplan');
        setFloorplan({ png: null, split: {} });
        
        const tx_result = db.transaction('resultFiles', 'readwrite');
        const store_result = tx_result.objectStore('resultFiles');
        await store_result.delete('results');
        resultFilesDispatch({type:'all', value:initialResultFilesState})
    };

    const setFloorplanPNG = (png) =>
        setFloorplan((prevFiles) => ({
            ...prevFiles,
            png:png,
        }));
    
    const setFloorplanSplit = (split) => 
        setFloorplan((prevFiles)=> ({
            ...prevFiles,
            split:split,
        }));

    return (
        <FileContext.Provider value={{ 
        floorplan, setFloorplanPNG, setFloorplanSplit,  
        resultFiles, resultFilesDispatch,
        viewLayers, setViewLayers,
        loading, error, clearFiles,
        updateState, setUpdateState}}>
            {!loading && children}
        </FileContext.Provider>
    );
};

export { FileContext, FileProvider };