async function ScanDTC({ select, until, dispatch }) {
  while (true) {
    await until("start_scan");
    let [vehicleId] = select("vehicleId");
    if (!vehicleId) {
      await dispatch(SelectVehicle);
    }
  }
}

async function SelectVehicle({}) {}
