// Main App JS: camera, upload, detection, and rendering
(function(){
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  let videoStream = null;
  const basket = new Set();
  const LS_KEY = 'recipeAssistant.basket';
  function saveBasket(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(Array.from(basket))); }catch(e){} }
  function loadBasket(){ try{ const arr = JSON.parse(localStorage.getItem(LS_KEY)||'[]'); if(Array.isArray(arr)) arr.forEach(i=> basket.add(String(i).toLowerCase())); }catch(e){} }
  
  // Pagination state
  let allRecipes = [];
  let currentPage = 1;
  const recipesPerPage = 12;

  function show(el){ el.classList.remove('d-none'); }
  function hide(el){ el.classList.add('d-none'); }

  function toast(message, variant = 'danger'){
    const containerId = 'toastContainer';
    let container = qs('#'+containerId);
    if (!container){
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const id = 't'+Date.now();
    container.insertAdjacentHTML('beforeend', `
      <div id="${id}" class="toast align-items-center text-bg-${variant} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`);
    const t = new bootstrap.Toast(qs('#'+id), { delay: 3500 });
    t.show();
  }

  async function startCamera(){
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoStream = stream;
      qs('#videoElement').srcObject = stream;
      show(qs('#cameraContainer'));
      hide(qs('#previewContainer'));
      hide(qs('#startCameraBtn'));
      show(qs('#captureBtn'));
      show(qs('#stopCameraBtn'));
    } catch (err){
      toast('Camera error: ' + err.message);
    }
  }

  function stopCamera(){
    if (videoStream){
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
    hide(qs('#cameraContainer'));
    show(qs('#startCameraBtn'));
    hide(qs('#captureBtn'));
    hide(qs('#stopCameraBtn'));
  }

  function capturePhoto(){
    const video = qs('#videoElement');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    qs('#preview').src = imageData;
    show(qs('#previewContainer'));
    hide(qs('#cameraContainer'));
    detectIngredients(imageData);
  }

  function onUploadChange(e){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target.result;
      qs('#preview').src = imageData;
      show(qs('#previewContainer'));
      hide(qs('#cameraContainer'));
      detectIngredients(imageData);
    };
    reader.readAsDataURL(file);
  }

  function drawBoundingBoxes(boxes, imgElement){
    if (!boxes || !boxes.length) {
      // If no boxes, just remove any existing canvas overlay
      const container = qs('#previewContainer');
      const oldCanvas = container.querySelector('canvas');
      if (oldCanvas) oldCanvas.remove();
      return;
    }
    
    const container = qs('#previewContainer');
    // Remove any existing canvas
    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    
    // Create canvas overlay
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.className = 'rounded-3';
    
    // Set canvas size to match image
    const rect = imgElement.getBoundingClientRect();
    canvas.width = imgElement.naturalWidth || rect.width;
    canvas.height = imgElement.naturalHeight || rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    container.style.position = 'relative';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const scaleX = canvas.width / imgElement.naturalWidth;
    const scaleY = canvas.height / imgElement.naturalHeight;
    
    // Draw each bounding box
    boxes.forEach((box, idx) => {
      const x = box.x - (box.width / 2);
      const y = box.y - (box.height / 2);
      
      // Generate color based on index
      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      const color = colors[idx % colors.length];
      
      // Draw box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, box.width, box.height);
      
      // Draw label background
      ctx.fillStyle = color;
      const label = `${box.class} ${box.confidence}%`;
      ctx.font = 'bold 16px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 5, y - 7);
    });
  }

  function setLoading(loading){
    if (loading) show(qs('#loadingIndicator')); else hide(qs('#loadingIndicator'));
  }

  function renderRawDetections(list){
    const box = qs('#rawDetections');
    box.innerHTML = list.map(d => `<span class="badge rounded-pill bg-light text-dark me-2 mb-2">${d.class}: ${d.confidence}%</span>`).join('');
    show(qs('#detectionInfo'));
  }

  function renderIngredients(items){
    const box = qs('#ingredientList');
    if (!items || !items.length){
      box.innerHTML = '<div class="text-center text-muted py-3">No ingredients detected above the confidence threshold.</div>';
    } else {
      box.innerHTML = items.map(i => `<span class="ingredient-tag ingredient-matched">${formatIngredient(i)}</span>`).join('');
    }
    show(qs('#ingredientsCard'));
  }

  function renderBasket(){
    const list = qs('#basketList');
    const items = Array.from(basket);
    if (items.length){
      list.innerHTML = items.map(i => `
        <span class="ingredient-tag ingredient-matched chip" data-item="${i}">
          <span>${formatIngredient(i)}</span>
          <span class="remove" title="Remove" aria-label="Remove">×</span>
        </span>`).join('');
      // Attach remove handlers (event delegation)
      list.querySelectorAll('.ingredient-tag .remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tag = e.currentTarget.closest('.ingredient-tag');
          const val = tag.getAttribute('data-item');
          basket.delete(val);
          renderBasket();
          saveBasket();
          updateRecommendationsFromBasket();
        });
      });
    } else {
      list.innerHTML = '<span class="text-muted">No ingredients yet.</span>';
    }
    show(qs('#basketCard'));
  }

  function renderRecipePage(){
    const container = qs('#recipeContainer');
    const emptyEl = qs('#recipesEmpty');
    const paginationEl = qs('#recipePagination');
    const prevBtn = qs('#prevPageBtn');
    const nextBtn = qs('#nextPageBtn');
    const pageInfo = qs('#pageInfo');
    
    if (!allRecipes.length){
      container.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('d-none');
      if (paginationEl) hide(paginationEl);
      return;
    }
    
    if (emptyEl) emptyEl.classList.add('d-none');
    
    const start = (currentPage - 1) * recipesPerPage;
    const end = start + recipesPerPage;
    const pageRecipes = allRecipes.slice(start, end);
    const totalPages = Math.ceil(allRecipes.length / recipesPerPage);
    
    container.innerHTML = pageRecipes.map(recipeCard).join('');
    attachCardHandlers();
    
    // Update pagination controls
    if (totalPages > 1){
      show(paginationEl);
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
    } else {
      hide(paginationEl);
    }
  }

  async function updateRecommendationsFromBasket(){
    const items = Array.from(basket);
    const emptyEl = qs('#recipesEmpty');
    const container = qs('#recipeContainer');
    if (!items.length){
      // Clear recipes and show empty state
      allRecipes = [];
      currentPage = 1;
      if (container) container.innerHTML = '';
      if (emptyEl){ emptyEl.classList.remove('d-none'); }
      hide(qs('#recipePagination'));
      show(qs('#recipesCard'));
      return;
    }
    try{
      const res = await fetch('/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: items })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Recommend failed');
      // Only show recipes that have at least 1 matching ingredient
      allRecipes = (data.recipes||[]).filter(r => (r.match_percent||0) > 0);
      currentPage = 1;
      renderRecipePage();
      show(qs('#recipesCard'));
    }catch(err){
      toast(err.message || 'Recommend failed');
    }
  }

  function formatIngredient(ing){
    // Replace underscores with spaces and capitalize first letter of each word
    return ing.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function recipeCard(recipe){
    const badgeColor = recipe.match_percent >= 50 ? 'success' : (recipe.match_percent >= 25 ? 'warning' : 'secondary');
    const have = (recipe.matched_ingredients || []).map(i=>`<span class="ingredient-tag ingredient-matched">${formatIngredient(i)}</span>`).join('');
    const need = (recipe.needed_ingredients || []).slice(0,5).map(i=>`<span class="ingredient-tag ingredient-needed">${formatIngredient(i)}</span>`).join('');
    const more = (recipe.needed_ingredients||[]).length > 5 ? `<span class="small-muted">+${recipe.needed_ingredients.length-5} more</span>` : '';
    return `
      <div class="col-md-6 col-xl-4">
        <div class="card recipe-card h-100 p-3">
          <div class="text-center" style="font-size:48px">${recipe.image}</div>
          <h6 class="mt-2 mb-1 text-center">${recipe.name}</h6>
          <div class="text-center small-muted mb-2">${recipe.time} • ${recipe.servings} servings • ${recipe.difficulty}</div>
          <div class="text-center mb-3">
            <span class="badge text-bg-${badgeColor} match-badge">${recipe.match_percent}% Match</span>
            <div class="small-muted">${recipe.matched_count} of ${recipe.total_count} ingredients</div>
          </div>
          <div class="mb-2"><strong class="small">You have</strong><div>${have || '<span class="text-muted small">None</span>'}</div></div>
          <div class="mb-2"><strong class="small">You need</strong><div>${need} ${more}</div></div>
          <div class="mt-auto d-grid">
            <button class="btn btn-outline-primary btn-sm" data-recipe='${JSON.stringify(recipe).replace(/'/g, '&#39;')}'>View Details</button>
          </div>
        </div>
      </div>`
  }

  function attachCardHandlers(){
    qsa('#recipeContainer button[data-recipe]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipe = JSON.parse(btn.getAttribute('data-recipe'));
        showRecipeModal(recipe);
      });
    });
  }

  function showRecipeModal(recipe){
    qs('#recipeModalLabel').textContent = recipe.name;
    qs('#modalEmoji').textContent = recipe.image || '🍽️';
    qs('#modalMeta').textContent = `${recipe.time} • ${recipe.servings} servings • ${recipe.difficulty}`;
    qs('#modalMatch').textContent = `${recipe.match_percent}% match`;
    qs('#modalHave').innerHTML = (recipe.matched_ingredients||[]).map(i=>`<span class="ingredient-tag ingredient-matched">${formatIngredient(i)}</span>`).join('');
    qs('#modalNeed').innerHTML = (recipe.needed_ingredients||[]).map(i=>`<span class="ingredient-tag ingredient-needed">${formatIngredient(i)}</span>`).join('');
    qs('#modalInstructions').textContent = recipe.instructions || '';
    const modal = new bootstrap.Modal(qs('#recipeModal'));
    modal.show();
  }

  async function detectIngredients(imageData){
    setLoading(true);
    try{
      const res = await fetch(window.APP_CONFIG.detectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData })
      });
      const data = await res.json();
      if (!data.success){ throw new Error(data.error || 'Unknown error'); }
      
      if (data.raw_detections && data.raw_detections.length) renderRawDetections(data.raw_detections);
      const newlyDetected = (data.detected_ingredients || []).map(i => (i||'').toLowerCase());
      renderIngredients(newlyDetected);

      
      // Draw bounding boxes on the image
      if (data.bounding_boxes && data.bounding_boxes.length) {
        const imgElement = qs('#preview');
        // Wait for image to load before drawing
        if (imgElement.complete) {
          drawBoundingBoxes(data.bounding_boxes, imgElement);
        } else {
          imgElement.onload = () => drawBoundingBoxes(data.bounding_boxes, imgElement);
        }
      }

      // Auto-stack: add newly detected ingredients into the basket and update recommendations
      if (newlyDetected.length){
        newlyDetected.forEach(i => { if (i) basket.add(i); });
        saveBasket();
        toast(`Added ${newlyDetected.length} detected ingredient${newlyDetected.length>1?'s':''} to your list`, 'success');
      }
      renderBasket();
      await updateRecommendationsFromBasket();
      // Ensure the right-side suggestions are visible
      qs('#recipesCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err){
      console.error('Detection error:', err);
      toast(err.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  }

  // Cleanup on page unload/close
  window.addEventListener('beforeunload', () => {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
    }
  });

  // Handle visibility changes (app going to background)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && videoStream) {
      stopCamera();
    }
  });

  // Wire up events
  window.addEventListener('DOMContentLoaded', () => {
    // Load basket
    loadBasket();
    renderBasket();
    // Reflect current basket into recommendations (and show empty-state if none)
    updateRecommendationsFromBasket();
    // Threshold slider removed; using server default threshold

    qs('#startCameraBtn').addEventListener('click', startCamera);
    qs('#stopCameraBtn').addEventListener('click', stopCamera);
    qs('#captureBtn').addEventListener('click', capturePhoto);
    qs('#imageUpload').addEventListener('change', onUploadChange);

    // Drag and Drop (desktop only)
    const drop = qs('#dropZone');
    if (drop){
      ;['dragenter','dragover'].forEach(evt => drop.addEventListener(evt, (e)=>{ e.preventDefault(); e.stopPropagation(); drop.classList.add('dragover'); }));
      ;['dragleave','drop'].forEach(evt => drop.addEventListener(evt, (e)=>{ e.preventDefault(); e.stopPropagation(); drop.classList.remove('dragover'); }));
      drop.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const imageData = ev.target.result;
          qs('#preview').src = imageData;
          show(qs('#previewContainer'));
          hide(qs('#cameraContainer'));
          detectIngredients(imageData);
        };
        reader.readAsDataURL(file);
      });
    }

    const clearBtn = qs('#clearBasketBtn');
    if (clearBtn){
      clearBtn.addEventListener('click', () => {
        basket.clear();
        renderBasket();
        saveBasket();
        updateRecommendationsFromBasket();
        toast('Cleared ingredient list', 'info');
      });
    }

    // Clear preview button
    const clearPreviewBtn = qs('#clearPreviewBtn');
    if (clearPreviewBtn){
      clearPreviewBtn.addEventListener('click', () => {
        hide(qs('#previewContainer'));
        hide(qs('#detectionInfo'));
        hide(qs('#ingredientsCard'));
        qs('#preview').src = '';
        // Remove any canvas overlay
        const container = qs('#previewContainer');
        const oldCanvas = container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
        toast('Cleared preview image', 'info');
      });
    }

    // Pagination controls
    const prevBtn = qs('#prevPageBtn');
    const nextBtn = qs('#nextPageBtn');
    if (prevBtn){
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1){
          currentPage--;
          renderRecipePage();
          qs('#recipesCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
    if (nextBtn){
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allRecipes.length / recipesPerPage);
        if (currentPage < totalPages){
          currentPage++;
          renderRecipePage();
          qs('#recipesCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });
})();
