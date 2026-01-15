<script setup>
const emit = defineEmits(['on-update'])

const activeClasses = ref('')

function setActive (e) {
  activeClasses.value = 'bg-slate-200'
}

function unsetActive (e) {
  activeClasses.value = ''
}

function onDrop (e) {
  // console.log('💧 Dropped')
  unsetActive(e)
  if (e.dataTransfer.items) {
    const files = [...e.dataTransfer.items]
      .map(item => item.getAsFile())
      .filter(file => file)
    _showFiles(files)
  }
  else {
    console.error('⛔️ Browser does not support `DataTransferItemList` interface.')
  }
}

function onFilesSelected (e) {
  // console.log('💧 Selected')
  if (e.target.files) {
    _showFiles([...e.target.files])
  }
  else {
    console.error('⛔️ Browser does not support `FileList` interface.')
  }
}

function _showFiles (files) {
  emit('on-update', files)
  // files.forEach((file, i) => {
  //   console.log(i)
  //   console.log(file)
  // })
}
</script>

<template>
  <div>
    <label
      id="js-dropzone"
      class="my-5 p-5 flex flex-col items-center justify-center cursor-pointer w-full min-h-20 rounded-sm border border-slate-400 border-dashed text-center"
      :class="activeClasses"
      @drop.prevent="onDrop"
      @dragover.prevent="setActive"
      @dragenter.prevent="setActive"
      @dragend.prevent="unsetActive"
      @dragleave.prevent="unsetActive"
    >
      <input
        id="js-files"
        type="file"
        class="hidden"
        multiple
        accept="image/*"
        @change="onFilesSelected"
      >

      <div class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100">
        <UIcon name="i-lucide-image" class="size-5 text-slate-500" />
      </div>

      <p class="my-1 text-slate-600 text-sm font-semibold">
        Drag and drop files here
      </p>

      <p class="my-1 text-slate-400 text-sm">
        PNG or JPG (max. 2MB)
      </p>
    </label>
  </div>
</template>

<style>
.dropzone {
  background: #f1f1f1;
  border: 2px dashed #ccc;
  margin: 1em 0;
  padding: 5em 3em;
  text-align: center;
}

.dropzone.active {
  background: #ccc;
}
</style>
