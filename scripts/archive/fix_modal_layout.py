import re

with open("frontend/src/pages/borrow/BorrowRequestsPage.jsx", "r") as f:
    content = f.read()

# 1. Change the main container
content = content.replace(
    'className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3"',
    'className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap gap-2 items-center justify-end"'
)

# 2. Add w-full to the flex gap-2 containers inside the modal
# We'll use regex to target specific lines in the modal portion
# The modal portion starts around line 850
modal_start = content.find('className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap gap-2 items-center justify-end"')

def add_w_full(pattern, replacement):
    global content
    before = content[:modal_start]
    after = content[modal_start:]
    after = re.sub(pattern, replacement, after, count=0)
    content = before + after

add_w_full(r'className="flex gap-2"', r'className="flex gap-2 w-full"')
add_w_full(r'className="flex justify-between items-center gap-2"', r'className="flex justify-between items-center gap-2 w-full"')
add_w_full(r'className="flex flex-col gap-2"', r'className="flex flex-col gap-2 w-full"')
add_w_full(r'className="flex items-center justify-center gap-1.5 py-1.5 px-3', r'className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3')
add_w_full(r'className="flex items-center justify-between gap-1.5 py-1.5 px-3', r'className="w-full flex items-center justify-between gap-1.5 py-1.5 px-3')
add_w_full(r'className="flex items-center justify-center gap-2 py-1.5 px-3', r'className="w-full flex items-center justify-center gap-2 py-1.5 px-3')


# 3. Handle the Lender Started Approved status
lender_started_old = """                  ) : modalIsStarted ? (
                    <div className="w-full flex gap-2">
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "handover");
                          closeBookingModal({ ...selectedBookingForModal, status: "handover_requested" });
                        }}
                        className="flex-1 btn-primary !py-2.5 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark as Handed Over
                      </button>
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "cancelled");
                        }}
                        className="flex-none btn-secondary !py-2.5 text-xs text-red-600 hover:bg-red-50 border-red-100 flex items-center justify-center gap-1.5"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel Booking
                      </button>
                    </div>"""
lender_started_new = """                  ) : modalIsStarted ? (
                    <>
                      <div className="w-full">
                        <button
                          onClick={async () => {
                            await handleStatusChange(selectedBookingForModal.id, "handover");
                            closeBookingModal({ ...selectedBookingForModal, status: "handover_requested" });
                          }}
                          className="w-full btn-primary !py-2.5 text-xs flex items-center justify-center gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark as Handed Over
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          await handleStatusChange(selectedBookingForModal.id, "cancelled");
                        }}
                        className="btn-secondary !py-2 text-xs text-red-600 hover:bg-red-50 border-red-100 flex items-center gap-1.5 mr-auto"
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancel Booking
                      </button>
                    </>"""
content = content.replace(lender_started_old, lender_started_new)

# 4. Handle the bottom row (remove Close Details, flatten Message & Report Issue)
bottom_row_old = """                {/* Bottom Row — Message + Report Issue (left) | Close Details (right) */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                  <div className="flex gap-2 mr-auto">
                    {["active", "returned", "damaged", "late"].includes(selectedBookingForModal.status) && (
                      <a
                        href={`/complaints?borrow_request_id=${selectedBookingForModal.id}&resource_id=${selectedBookingForModal.resource?.id || ''}&against_user_id=${(isLenderModal ? selectedBookingForModal.borrower?.id : selectedBookingForModal.lender?.id) || ''}&category=dispute`}
                        className="btn-secondary !py-2 !px-3 text-xs text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-1.5"
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> Report Issue
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenChatId(selectedBookingForModal.id);
                        closeBookingModal();
                      }}
                      className="btn-secondary !py-2 !px-4 text-xs flex items-center gap-1.5"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Message
                    </button>
                  </div>
                  <button
                    onClick={() => closeBookingModal()}
                    className="btn-secondary !py-2 !px-4 text-xs"
                  >
                    Close Details
                  </button>
                </div>"""
bottom_row_new = """                {/* Message + Report Issue */}
                {["active", "returned", "damaged", "late"].includes(selectedBookingForModal.status) && (
                  <a
                    href={`/complaints?borrow_request_id=${selectedBookingForModal.id}&resource_id=${selectedBookingForModal.resource?.id || ''}&against_user_id=${(isLenderModal ? selectedBookingForModal.borrower?.id : selectedBookingForModal.lender?.id) || ''}&category=dispute`}
                    className="btn-secondary !py-2 !px-3 text-xs text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-1.5 mr-auto"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Report Issue
                  </a>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenChatId(selectedBookingForModal.id);
                    closeBookingModal();
                  }}
                  className="btn-secondary !py-2 !px-4 text-xs flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Message
                </button>"""
content = content.replace(bottom_row_old, bottom_row_new)

with open("frontend/src/pages/borrow/BorrowRequestsPage.jsx", "w") as f:
    f.write(content)

print("Done")
