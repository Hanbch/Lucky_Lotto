/**
 * 로또 역대 당첨번호 최신 회차 동기화 (브라우저용)
 * - 로컬 from 회차 이후 ~ 최신 회차까지 조회
 * - 반환: { ok, latest, from, addedCount, added: ["1-2-3-4-5-6", ...] }
 */
(function (global) {
	var BASE = "https://smok95.github.io/lotto/results";
	var MAX_FETCH = 40;

	function keyOf(nums) {
		return nums
			.map(Number)
			.sort(function (a, b) { return a - b; })
			.join("-");
	}

	function fetchJson(url) {
		return fetch(url, { cache: "no-store" }).then(function (res) {
			if (!res.ok) throw new Error("HTTP " + res.status);
			return res.json();
		});
	}

	/**
	 * @param {number} fromNo 이미 보유한 최신 회차
	 * @returns {Promise<{ok:boolean,latest:number,from:number,addedCount:number,added:string[],error?:string}>}
	 */
	function syncLottoHistory(fromNo) {
		fromNo = parseInt(fromNo, 10) || 0;

		return fetchJson(BASE + "/latest.json?_=" + Date.now())
			.then(function (latest) {
				var latestNo = parseInt(latest && latest.draw_no, 10) || 0;
				if (!latestNo) {
					return {
						ok: false,
						error: "latest_parse_fail",
						latest: fromNo,
						from: fromNo,
						addedCount: 0,
						added: []
					};
				}

				if (latestNo <= fromNo) {
					return {
						ok: true,
						latest: latestNo,
						from: fromNo,
						addedCount: 0,
						added: []
					};
				}

				var start = fromNo + 1;
				if (latestNo - fromNo > MAX_FETCH) {
					start = latestNo - MAX_FETCH + 1;
				}

				var reqs = [];
				for (var n = start; n <= latestNo; n++) {
					reqs.push(
						fetchJson(BASE + "/" + n + ".json")
							.then(function (row) {
								if (!row || !row.numbers || !row.numbers.length) return "";
								return keyOf(row.numbers);
							})
							.catch(function () { return ""; })
					);
				}

				return Promise.all(reqs).then(function (keys) {
					var added = [];
					var seen = {};
					keys.forEach(function (k) {
						if (!k || seen[k]) return;
						seen[k] = true;
						added.push(k);
					});
					return {
						ok: true,
						latest: latestNo,
						from: fromNo,
						addedCount: added.length,
						added: added
					};
				});
			})
			.catch(function () {
				return {
					ok: false,
					error: "latest_fetch_fail",
					latest: fromNo,
					from: fromNo,
					addedCount: 0,
					added: []
				};
			});
	}

	global.syncLottoHistory = syncLottoHistory;
})(typeof window !== "undefined" ? window : this);
