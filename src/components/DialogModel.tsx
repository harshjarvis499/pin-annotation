import React, { useEffect, useState } from 'react'
import { Dialog } from 'primereact/dialog';
import { PinDetailEntity } from './PDFViewer';
import { Pin, usePDFContext } from '../contexts/PDFContext';


interface DialogModelPropEntity {
    isOpen: boolean;
    onClose: () => void;
    pinDetail: PinDetailEntity | null;
    setPinDetail: React.Dispatch<React.SetStateAction<PinDetailEntity | null>> | null
}

const DialogModel: React.FC<DialogModelPropEntity> = ({ isOpen, onClose, pinDetail, setPinDetail }) => {

    const [formDetail, setFormDetail] = useState({
        title: "",
        description: ""
    });

    const [existingPinDetail, setExistingPinDetail] = useState<Pin | null>(null);
    const {
        addPin,
        selectedPin,
        pins,
        updatePin,
        setSelectedPin
    } = usePDFContext();



    const handleClear = () => {
        setFormDetail(prev => ({
            title: "",
            description: ""
        }))
    }

    const handleChange = (name: string, value: string) => {
        setFormDetail((prev) => ({
            ...prev,
            [name]: value
        }));
    }


    const handleAddPin = () => {

        if (selectedPin) {
            updatePin(selectedPin, {
                description: formDetail.description,
                title: formDetail.title
            });
            setSelectedPin(null);
        } else {
            addPin({
                pageNumber: pinDetail ? pinDetail.pageNumber : 0,
                x: pinDetail ? pinDetail.x : 0,
                y: pinDetail ? pinDetail.y : 0,
                color: '#FF3B30',
                title: formDetail.title,
                description: formDetail.description
            });
        }
        handleClear();
        onClose();
    }

    useEffect(() => {
        if (selectedPin) {
            const selectPinDetail = (pins as Pin[]).find((item) => item.id === selectedPin);
            if (selectPinDetail) {
                setExistingPinDetail(selectPinDetail)
                setFormDetail({
                    description: selectPinDetail.description,
                    title: selectPinDetail.title
                })
            }
        }
    }, [selectedPin])
    return (
        <Dialog header="Pin Detail" visible={isOpen} style={{ width: '50vw' }} onHide={() => { onClose(); if (setPinDetail) { setPinDetail(null) } }}>
            <div className="mx-4">
                <div className="mb-5">
                    <label htmlFor="title" className="block mb-2 text-sm font-medium">Title</label>
                    <input type="text" id="title" name="title" value={formDetail.title} onChange={(e) => handleChange(e.target.name, e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 " required />
                </div>
                <div className="mb-5">
                    <label htmlFor="Description" className="block mb-2 text-sm font-medium">Description</label>
                    <input type="text" id="Description" name="description" value={formDetail.description} onChange={(e) => handleChange(e.target.name, e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 " required />
                </div>
                <button onClick={handleAddPin} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Submit</button>
            </div>

        </Dialog>
    )
}

export default DialogModel