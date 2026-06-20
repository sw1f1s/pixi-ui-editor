import { exportProject } from "../packages/exporter/src/index.js";
import { createPixiUiRuntime, createPlainPixiAdapter } from "../packages/runtime/src/index.js";

const projectDocument = {
  schemaVersion: "1.0.0",
  project: {
    id: "project_shop_ui",
    name: "Shop UI"
  },
  assets: [
    {
      id: "coin_icon",
      name: "Coin Icon",
      type: "texture",
      src: "assets/coin.png",
      width: 64,
      height: 64
    }
  ],
  locales: [
    {
      id: "en",
      entries: {
        "shop.coins": "Coins: {{coins}}",
        "reward.claimed": "Claimed"
      }
    }
  ],
  components: [
    {
      id: "reward_badge",
      name: "RewardBadge",
      rootNode: {
        id: "reward_badge.root",
        name: "RewardBadgeRoot",
        type: "container",
        children: [
          {
            id: "reward_badge.label",
            name: "RewardBadgeLabel",
            type: "graphics",
            props: {},
            components: [
              {
                id: "text",
                type: "text",
                props: {
                  text: "Reward",
                  fill: "#ffffff",
                  fontSize: 18
                }
              }
            ]
          }
        ]
      }
    }
  ],
  pages: [
    {
      id: "shop",
      name: "Shop",
      canvas: {
        width: 1280,
        height: 720
      },
      rootNode: {
        id: "shop.root",
        name: "ShopRoot",
        type: "container",
        children: [
          {
            id: "coinsIcon",
            name: "CoinsIcon",
            type: "graphics",
            props: {},
            components: [
              {
                id: "texture",
                type: "texture",
                props: {
                  assetId: "coin_icon"
                }
              }
            ],
            transform: {
              x: 24,
              y: 24,
              width: 32,
              height: 32
            }
          },
          {
            id: "coinsLabel",
            name: "CoinsLabel",
            type: "graphics",
            props: {},
            components: [
              {
                id: "text",
                type: "text",
                props: {
                  localizationKey: "shop.coins",
                  fill: "#ffe27a",
                  fontSize: 24
                }
              }
            ],
            transform: {
              x: 64,
              y: 28
            }
          },
          {
            id: "dailyReward",
            name: "dailyReward",
            type: "componentInstance",
            componentId: "reward_badge",
            transform: {
              x: 24,
              y: 96
            },
            states: {
              claimed: {
                alpha: 0.72,
                props: {
                  eventMode: "none"
                }
              }
            }
          }
        ]
      }
    }
  ]
};

const bundle = exportProject(projectDocument, {
  generatedAt: "2026-05-19T00:00:00.000Z"
});
const adapter = createPlainPixiAdapter();
const stage = adapter.createContainer({ node: { id: "stage", name: "Stage", type: "container" }, path: "stage" });
const runtime = await createPixiUiRuntime({
  manifest: bundle.manifest,
  adapter,
  locale: "en",
  data: {
    coins: 1200
  }
});
const screen = await runtime.mountScreen("shop", { container: stage });

screen.setState("dailyReward", "claimed");
screen.updateData({ coins: 1500 });

console.log(
  JSON.stringify(
    {
      summary: bundle.summary,
      mountedRootKind: stage.children[0].kind,
      coinsText: screen.find("coinsLabel").displayObject.text,
      dailyRewardAlpha: screen.find("dailyReward").displayObject.alpha,
      stageChildrenAfterMount: stage.children.length
    },
    null,
    2
  )
);

screen.destroy();
runtime.destroy();
